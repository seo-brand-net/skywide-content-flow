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
        const { request_id, run_id, webhook_response } = body;

        console.log(`[n8n Complete Webhook] Received:`, { request_id, run_id, webhook_response });

        if (!request_id) {
            return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
        }

        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Update the Main Request
        const { error: reqError } = await supabase
            .from('content_requests')
            .update({
                status: 'complete',
                webhook_response: webhook_response || null,
                webhook_sent: true,
                error_message: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', request_id);

        if (reqError) {
            console.error('[n8n Complete Webhook] Error updating content_requests:', reqError);
        }

        // 2. Update the specific run if provided
        if (run_id) {
            const { error: runError } = await supabase
                .from('content_runs')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', run_id);
            
            if (runError) {
                console.error('[n8n Complete Webhook] Error updating content_runs:', runError);
            }
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
