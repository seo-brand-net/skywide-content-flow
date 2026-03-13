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
    await supabase
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

    // ── Fire the n8n webhook ──────────────────────────────────────────────
    const webhookUrl = process.env.N8N_CONTENT_ENGINE_WEBHOOK_URL!;
    const webhookPayload = {
        run_id: newRun.id,
        request_id: requestId,
        articleTitle: contentRequest.article_title,
        titleAudience: contentRequest.title_audience,
        seoKeywords: contentRequest.seo_keywords,
        articleType: contentRequest.article_type,
        clientName: contentRequest.client_name,
        creativeBrief: contentRequest.creative_brief,
        revisionNotes: revisionNotes,
        isRevision: true,
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
        console.error('[Revise] Webhook failed:', webhookRes?.status);
        // We still return success for the DB update but note the webhook issue
        return NextResponse.json({
            success: true,
            warning: 'Run created but webhook dispatch may have failed.',
            runId: newRun.id,
        });
    }

    return NextResponse.json({ success: true, runId: newRun.id });
}
