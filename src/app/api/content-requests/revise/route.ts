import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

/**
 * POST /api/content-requests/[id]/revise
 *
 * Request a revision for a completed content request.
 * Fires the n8n webhook again with the original payload + revision_notes.
 *
 * Body: { revisionNotes: string }
 */
export async function POST(
    req: NextRequest,
) {
    // ── Auth check ───────────────────────────────────────────────────────
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestId: string = body.request_id;
    const revisionNotes: string = (body.revisionNotes || '').trim();

    if (!requestId) {
        return NextResponse.json({ error: 'Missing request_id in body' }, { status: 400 });
    }

    // Use service-role client for DB reads/writes
    const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Fetch the original request ────────────────────────────────────────
    const { data: contentRequest, error: fetchError } = await supabase
        .from('content_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (fetchError || !contentRequest) {
        return NextResponse.json({ error: 'Content request not found' }, { status: 404 });
    }

    // Only the owner or an admin may request a revision
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = contentRequest.user_id === user.id;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Create a new run record ───────────────────────────────────────────
    const { data: newRun, error: runError } = await supabase
        .from('content_runs')
        .insert({
            content_request_id: requestId,
            status: 'running',
            created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (runError || !newRun) {
        console.error('[Revise] Failed to create content_run:', runError);
        return NextResponse.json({ error: 'Failed to create run record' }, { status: 500 });
    }

    // ── Reset request status & point to new run ───────────────────────────
    const { error: updateError } = await supabase
        .from('content_requests')
        .update({
            status: 'in_progress',
            error_message: null,
            webhook_sent: true,
            current_run_id: newRun.id,
            improvement_notes: revisionNotes || contentRequest.improvement_notes,
            webhook_response: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    if (updateError) {
        console.error('[Revise] Failed to update request status:', updateError);
        return NextResponse.json({ error: 'Failed to update request status', detail: updateError.message }, { status: 500 });
    }

    // ── Fire the n8n webhook ──────────────────────────────────────────────
    const webhookUrl = process.env.N8N_CONTENT_ENGINE_WEBHOOK_URL!;
    const webhookPayload = {
        // Shared fields (snake_case)
        title: contentRequest.article_title,
        audience: contentRequest.title_audience,
        client_name: contentRequest.client_name,
        creative_brief: contentRequest.creative_brief,
        article_type: contentRequest.article_type,
        word_count: contentRequest.word_count,
        primary_keywords: Array.isArray(contentRequest.primary_keywords) 
            ? contentRequest.primary_keywords.join(', ') 
            : contentRequest.primary_keywords,
        secondary_keywords: Array.isArray(contentRequest.secondary_keywords)
            ? contentRequest.secondary_keywords.join(', ')
            : contentRequest.secondary_keywords,
        semantic_theme: Array.isArray(contentRequest.semantic_themes)
            ? contentRequest.semantic_themes.join(', ')
            : contentRequest.semantic_themes,
        tone: contentRequest.tone,
        page_intent: contentRequest.page_intent,
        
        // IDs and metadata
        request_id: requestId,
        run_id: newRun.id,
        user_id: user.id,
        timestamp: new Date().toISOString(),

        // Revision specific fields
        revision_notes: revisionNotes,
        original_content: contentRequest.webhook_response,
        is_revision: true,
    };

    console.log(`[Revise] Firing webhook for requestId ${requestId}, runId ${newRun.id}`);

    const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
    }).catch((err) => {
        console.error('[Revise] Webhook fetch error:', err);
        return null;
    });

    if (!webhookRes || !webhookRes.ok) {
        const webhookStatus = webhookRes?.status ?? 0;
        const webhookBody = await webhookRes?.json().catch(() => ({})) ?? {};
        console.error(`[Revise] Webhook dispatch failed (${webhookStatus}):`, webhookBody);

        // Rollback – mark the request back to cancelled so the user can retry
        await supabase.from('content_requests').update({
            status: 'cancelled',
            error_message: `Revision webhook dispatch failed (${webhookStatus}). Please try again.`,
            updated_at: new Date().toISOString(),
        }).eq('id', requestId);

        await supabase.from('content_runs').update({
            status: 'failed',
            completed_at: new Date().toISOString(),
        }).eq('id', newRun.id);

        return NextResponse.json({
            error: `Failed to dispatch revision to n8n (${webhookStatus})`,
            detail: webhookBody,
        }, { status: 502 });
    }

    return NextResponse.json({ success: true, run_id: newRun.id });
}
