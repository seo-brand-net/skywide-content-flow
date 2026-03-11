import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { triggerRunUpdate } from '@/lib/pusher/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { executionId, workflowId, workflowName, errorMessage, nodeName, runId } = body;

        console.log(`[n8n Error Webhook] Received error for run ${runId || executionId}`);
        console.log(`[n8n Error Webhook] Node: ${nodeName}, Error: ${errorMessage}`);

        if (!runId && !executionId) {
            return NextResponse.json(
                { error: 'Missing runId or executionId' },
                { status: 400 }
            );
        }

        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const formattedError = nodeName
            ? `Failed at stage '${nodeName}': ${errorMessage || 'Unknown error'}`
            : (errorMessage || 'Unknown workflow error');

        // Helper to mark a content_request as error
        async function markRequestAsError(requestId: string) {
            await supabase
                .from('content_requests')
                .update({
                    status: 'error',
                    error_message: formattedError,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId);

            await triggerRunUpdate(requestId, {
                status: 'error',
                error_message: formattedError
            });

            console.log(`[n8n Error Webhook] Successfully marked request ${requestId} as error`);
        }

        // ─── Strategy 1: direct run_id from payload ───────────────────────
        if (runId) {
            const { data: req } = await supabase
                .from('content_requests')
                .select('id')
                .eq('current_run_id', runId)
                .single();

            if (req) {
                await markRequestAsError(req.id);
                // Also mark the run as failed
                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', runId);
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
                await markRequestAsError(runData.content_request_id);
                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', runData.id);
                return NextResponse.json({ success: true, requestId: runData.content_request_id, method: 'execution_id' });
            }
        }

        // ─── Strategy 3: fallback — most recent pending request ───────────
        // This handles the case where the workflow errored before the poller
        // had a chance to save the executionId to a content_run record
        // (e.g., first node like Keyword Strategist fails immediately)
        console.log('[n8n Error Webhook] No execution match found, falling back to most recent pending request');
        const { data: pendingReq } = await supabase
            .from('content_requests')
            .select('id')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (pendingReq) {
            await markRequestAsError(pendingReq.id);
            return NextResponse.json({ success: true, requestId: pendingReq.id, method: 'fallback_pending' });
        }

        // Nothing found at all
        return NextResponse.json(
            { error: 'Could not find any matching content request to mark as error' },
            { status: 404 }
        );

    } catch (error: any) {
        console.error('[n8n Error Webhook] Processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error processing webhook' },
            { status: 500 }
        );
    }
}
