import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

/**
 * POST /api/content-requests/[id]/retry
 *
 * Retry a failed n8n execution for a given content request.
 * Admin-only. Uses the n8n REST API: POST /api/v1/executions/:executionId/retry
 *
 * Body: { id: string }  (the content_request id)
 */
export async function POST(
    req: NextRequest,
) {
    const body = await req.json().catch(() => ({}));
    const requestId: string = body.requestId;

    if (!requestId) {
        return NextResponse.json({ error: 'Missing requestId in body' }, { status: 400 });
    }

    // ── Auth check (admin only) ──────────────────────────────────────────
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Use service-role client for DB writes
    const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify caller is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });
    }

    // ── Look up the most recent run for this request ─────────────────────
    console.log(`[Retry] Looking for most recent run for request: ${requestId}`);
    const { data: run, error: runError } = await supabase
        .from('content_runs')
        .select('id, n8n_execution_id')
        .eq('content_request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (runError) {
        console.error('[Retry] DB Error looking up run:', runError);
        return NextResponse.json({ error: 'Database error looking up run', detail: runError.message }, { status: 500 });
    }

    if (!run) {
        console.error('[Retry] No run found in content_runs for request:', requestId);
        return NextResponse.json({ 
            error: 'No run found for this request', 
            requestId,
            hint: 'Ensure n8n has successfully started and called the start-webhook once for this request.'
        }, { status: 404 });
    }

    if (!run.n8n_execution_id) {
        return NextResponse.json(
            { error: 'No n8n execution ID recorded for this run. The workflow may have failed before it started.' },
            { status: 422 }
        );
    }

    // ── Call n8n Retry API ────────────────────────────────────────────────
    const n8nBase = process.env.N8N_BASE_URL!.replace(/\/$/, '');
    const retryUrl = `${n8nBase}/api/v1/executions/${run.n8n_execution_id}/retry`;

    console.log(`[Retry] Calling n8n retry: ${retryUrl}`);

    const n8nRes = await fetch(retryUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': process.env.N8N_API_KEY!,
        },
        body: JSON.stringify({ loadWorkflow: true }),
    });

    const n8nData: any = await n8nRes.json().catch(() => ({}));
    console.log(`[Retry] n8n response (${n8nRes.status}):`, JSON.stringify(n8nData).substring(0, 200));

    if (!n8nRes.ok) {
        return NextResponse.json(
            { error: `n8n retry failed (${n8nRes.status})`, detail: n8nData },
            { status: 502 }
        );
    }

    const newExecutionId = n8nData.id || n8nData.executionId; // n8n v1 usually returns 'id'
    if (newExecutionId) {
        console.log(`[Retry] Updating run ${run.id} with NEW executionId: ${newExecutionId}`);
        await supabase
            .from('content_runs')
            .update({ n8n_execution_id: newExecutionId })
            .eq('id', run.id);
    }

    // ── Reset request + run status ────────────────────────────────────────
    await supabase
        .from('content_requests')
        .update({
            status: 'in_progress',
            error_message: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    await supabase
        .from('content_runs')
        .update({
            status: 'running',
            completed_at: null,
        })
        .eq('id', run.id);

    return NextResponse.json({ success: true, executionId: run.n8n_execution_id });
}
