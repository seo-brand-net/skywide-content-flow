import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/webhooks/n8n-complete
 * 
 * Called by n8n when a content generation workflow completes successfully.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { request_id, run_id, webhook_response, raw_content } = body;

        console.log(`[n8n Complete Webhook] Received:`, { request_id, run_id, webhook_response, hasRawContent: !!raw_content });

        if (!request_id) {
            return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
        }

        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Update the Main Request
        const { data: updatedReq, error: reqError } = await supabase
            .from('content_requests')
            .update({
                status: 'complete',
                webhook_response: webhook_response || null,
                raw_content: raw_content || null,
                webhook_sent: true,
                error_message: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', request_id)
            .select('current_run_id')
            .single();

        if (reqError) {
            console.error('[n8n Complete Webhook] Error updating content_requests:', reqError);
        }

        // 2. Resolve run_id: use payload value first, then fall back to current_run_id on the request
        const resolvedRunId = run_id || updatedReq?.current_run_id;

        if (resolvedRunId) {
            const { error: runError } = await supabase
                .from('content_runs')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', resolvedRunId);
            
            if (runError) {
                console.error('[n8n Complete Webhook] Error updating content_runs:', runError);
            }
        } else {
            console.warn('[n8n Complete Webhook] No run_id available to mark run as completed.');
        }

        console.log(`[n8n Complete Webhook] Successfully marked request ${request_id} as complete`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[n8n Complete Webhook] UNCAUGHT ERROR:', error?.message);
        return NextResponse.json(
            { error: 'Internal server error', detail: error?.message },
            { status: 500 }
        );
    }
}
