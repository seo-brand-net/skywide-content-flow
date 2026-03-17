import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/webhooks/n8n-drive-url
 * 
 * Called by n8n when the Google Drive folder is created and its URL is ready.
 * This fires EARLY in the workflow (before AI drafting finishes).
 * It ONLY stores the Drive URL — it does NOT mark the request as "complete".
 * The actual completion signal comes from /api/webhooks/n8n-complete.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { request_id, run_id, webhook_response } = body;

        console.log(`[n8n Drive URL Webhook] Received:`, { request_id, run_id, webhook_response });

        if (!request_id) {
            return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
        }

        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Only save the Drive URL — do NOT change status
        const { error } = await supabase
            .from('content_requests')
            .update({
                webhook_response: webhook_response || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', request_id);

        if (error) {
            console.error('[n8n Drive URL Webhook] Error updating content_requests:', error);
            return NextResponse.json({ error: 'DB update failed', detail: error.message }, { status: 500 });
        }

        console.log(`[n8n Drive URL Webhook] Saved Drive URL for request ${request_id}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[n8n Drive URL Webhook] UNCAUGHT ERROR:', error?.message);
        return NextResponse.json(
            { error: 'Internal server error', detail: error?.message },
            { status: 500 }
        );
    }
}
