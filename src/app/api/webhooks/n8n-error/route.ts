import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { executionId, workflowId, workflowName, errorMessage, nodeName, runId } = body;

        console.log(`[n8n Error Webhook] Received:`, JSON.stringify({ executionId, nodeName, errorMessage, runId }));

        if (!runId && !executionId) {
            return NextResponse.json(
                { error: 'Missing runId or executionId' },
                { status: 400 }
            );
        }

        // Use service role client to bypass RLS — this endpoint is called by n8n with no user session
        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const formattedError = nodeName
            ? `Failed at stage '${nodeName}': ${errorMessage || 'Unknown error'}`
            : (errorMessage || 'Unknown workflow error');

        // ─── Strategy 1: direct run_id from payload ───────────────────────
        if (runId) {
            const { data: req } = await supabase
                .from('content_requests')
                .select('id')
                .eq('current_run_id', runId)
                .single();

            if (req) {
                await supabase.from('content_requests').update({
                    status: 'error',
                    error_message: formattedError,
                    updated_at: new Date().toISOString()
                }).eq('id', req.id);

                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', runId);

                console.log(`[n8n Error Webhook] Marked request ${req.id} as error via run_id`);
                return NextResponse.json({ success: true, requestId: req.id, method: 'run_id' });
            }
        }

        // ─── Strategy 2: look up by n8n executionId in content_runs ──────
        if (executionId) {
            const { data: runData } = await supabase
                .from('content_runs')
                .select('content_request_id, id')
                .eq('n8n_execution_id', executionId)
                .single();

            if (runData) {
                await supabase.from('content_requests').update({
                    status: 'error',
                    error_message: formattedError,
                    updated_at: new Date().toISOString()
                }).eq('id', runData.content_request_id);

                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', runData.id);

                console.log(`[n8n Error Webhook] Marked request ${runData.content_request_id} as error via executionId`);
                return NextResponse.json({ success: true, requestId: runData.content_request_id, method: 'execution_id' });
            }
        }

        // ─── Strategy 3: fallback — most recent pending request ───────────
        // Handles the case where the workflow errored before the poller saved the executionId
        console.log('[n8n Error Webhook] No execution match found, falling back to most recent pending request');
        const { data: pendingReq, error: pendingErr } = await supabase
            .from('content_requests')
            .select('id')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (pendingErr) {
            console.error('[n8n Error Webhook] Supabase error finding pending request:', pendingErr);
        }

        if (pendingReq) {
            await supabase.from('content_requests').update({
                status: 'error',
                error_message: formattedError,
                updated_at: new Date().toISOString()
            }).eq('id', pendingReq.id);

            console.log(`[n8n Error Webhook] Marked request ${pendingReq.id} as error via fallback`);
            return NextResponse.json({ success: true, requestId: pendingReq.id, method: 'fallback_pending' });
        }

        return NextResponse.json(
            { error: 'Could not find any matching content request to mark as error' },
            { status: 404 }
        );

    } catch (error: any) {
        console.error('[n8n Error Webhook] UNCAUGHT ERROR:', error?.message, error?.stack);
        return NextResponse.json(
            { error: 'Internal server error processing webhook', detail: error?.message },
            { status: 500 }
        );
    }
}
