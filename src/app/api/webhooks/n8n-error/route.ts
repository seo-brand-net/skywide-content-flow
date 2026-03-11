import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { triggerRunUpdate } from '@/lib/pusher/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { executionId, workflowId, workflowName, errorMessage, nodeName, runId } = body;

        console.log(`[n8n Error Webhook] Received error for run \${runId || executionId}`);
        console.log(`[n8n Error Webhook] Node: \${nodeName}, Error: \${errorMessage}`);

        if (!runId && !executionId) {
            return NextResponse.json(
                { error: 'Missing runId or executionId' },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        
        // 1. First find the content_request associated with this run
        let query = supabase.from('content_requests').select('id, user_id');
        
        if (runId) {
            // Priority: direct run_id mapping if we passed it all the way down
            query = query.eq('current_run_id', runId);
        } else if (executionId) {
            // Fallback: look up by execution_id in content_runs first
            const { data: runData } = await supabase
                .from('content_runs')
                .select('content_request_id')
                .eq('n8n_execution_id', executionId)
                .single();
                
            if (runData) {
                query = query.eq('id', runData.content_request_id);
            } else {
                return NextResponse.json(
                    { error: 'Could not find matching content run' },
                    { status: 404 }
                );
            }
        }

        const { data: requestData, error: requestError } = await query.single();

        if (requestError || !requestData) {
            console.error('[n8n Error Webhook] Failed to find content request', requestError);
            return NextResponse.json(
                { error: 'Content request not found' },
                { status: 404 }
            );
        }

        const requestId = requestData.id;
        const formattedError = nodeName 
            ? `Failed at stage '\${nodeName}': \${errorMessage || 'Unknown error'}`
            : (errorMessage || 'Unknown workflow error');

        // 2. Update the content_request status and error_message
        const { error: updateError } = await supabase
            .from('content_requests')
            .update({ 
                status: 'error',
                error_message: formattedError,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (updateError) {
            throw updateError;
        }

        // 3. Update the content_run status as well
        if (runId || executionId) {
            let runUpdateQuery = supabase.from('content_runs').update({
                status: 'failed',
                completed_at: new Date().toISOString()
            });

            if (runId) {
                runUpdateQuery = runUpdateQuery.eq('id', runId);
            } else {
                runUpdateQuery = runUpdateQuery.eq('n8n_execution_id', executionId);
            }
            await runUpdateQuery;
        }

        await triggerRunUpdate(requestId, {
            status: 'error',
            error_message: formattedError
        });

        console.log(`[n8n Error Webhook] Successfully marked request \${requestId} as error`);

        return NextResponse.json({ success: true, requestId });
        
    } catch (error: any) {
        console.error('[n8n Error Webhook] Processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error processing webhook' },
            { status: 500 }
        );
    }
}
