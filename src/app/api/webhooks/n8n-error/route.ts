import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { executionId, workflowId, workflowName, errorMessage, nodeName, run_id, request_id } = body;

        console.log(`[n8n Error Webhook] Received:`, JSON.stringify({ executionId, nodeName, errorMessage, run_id, request_id }));

        if (!run_id && !executionId && !request_id) {
            return NextResponse.json(
                { error: 'Missing run_id, executionId or request_id' },
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

        // ─── Strategy 0: direct request_id from payload (BEST) ────────────
        if (request_id) {
            await supabase.from('content_requests').update({
                status: 'cancelled',
                error_message: formattedError,
                updated_at: new Date().toISOString()
            }).eq('id', request_id);

            // If we also have a run_id, update that run too
            if (run_id) {
                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', run_id);
            }

            console.log(`[n8n Error Webhook] Marked request ${request_id} as error via direct request_id`);
            return NextResponse.json({ success: true, request_id, method: 'request_id' });
        }

        // ─── Strategy 1: direct run_id from payload ───────────────────────
        if (run_id) {
            const { data: req } = await supabase
                .from('content_requests')
                .select('id')
                .eq('current_run_id', run_id)
                .single();

            if (req) {
                await supabase.from('content_requests').update({
                    status: 'cancelled',
                    error_message: formattedError,
                    updated_at: new Date().toISOString()
                }).eq('id', req.id);

                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', run_id);

                console.log(`[n8n Error Webhook] Marked request ${req.id} as error via run_id`);
                return NextResponse.json({ success: true, request_id: req.id, method: 'run_id' });
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
                    status: 'cancelled',
                    error_message: formattedError,
                    updated_at: new Date().toISOString()
                }).eq('id', runData.content_request_id);

                await supabase.from('content_runs').update({
                    status: 'failed',
                    completed_at: new Date().toISOString()
                }).eq('id', runData.id);

                console.log(`[n8n Error Webhook] Marked request ${runData.content_request_id} as error via executionId`);
                return NextResponse.json({ success: true, request_id: runData.content_request_id, method: 'execution_id' });
            }
        }

        // ─── Strategy 3: LAST RESORT fallback — only if we have nothing else ─
        // WARNING: This is inherently risky and may match the wrong request.
        // Only runs if we truly have no executionId, no run_id, and no request_id.
        // In that case we cannot safely identify the right request — return 422.
        console.warn('[n8n Error Webhook] Cannot identify which request failed — no request_id, run_id, or executionId matched. Not updating any request status to avoid false positives.');
        return NextResponse.json(
            { 
                error: 'Could not identify a matching content request from the payload. Include request_id or run_id in the n8n error node payload for reliable matching.',
                received: { executionId, run_id, request_id: undefined }
            },
            { status: 422 }
        );

    } catch (error: any) {
        console.error('[n8n Error Webhook] UNCAUGHT ERROR:', error?.message, error?.stack);
        return NextResponse.json(
            { error: 'Internal server error processing webhook', detail: error?.message },
            { status: 500 }
        );
    }
}
