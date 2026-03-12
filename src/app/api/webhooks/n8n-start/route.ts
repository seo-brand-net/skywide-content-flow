import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Support both camelCase and snake_case for requestId
        const requestId = body.requestId || body.request_id;
        const executionId = body.executionId || body.execution_id;

        console.log(`[n8n Start Webhook] Received requestId: ${requestId}, executionId: ${executionId}`, body);

        if (!requestId || !executionId) {
            console.error('[n8n Start Webhook] Payload missing fields:', { requestId, executionId, body });
            return NextResponse.json(
                { error: 'Missing requestId or executionId', received: { requestId, executionId } },
                { status: 400 }
            );
        }

        // Use service role client to bypass RLS
        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Update the content_requests table with the n8n execution ID
        const { error } = await supabase
            .from('content_requests')
            .update({
                n8n_execution_id: executionId,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) {
            console.error('[n8n Start Webhook] Error updating content_requests:', error);
            return NextResponse.json({ error: 'Failed to update content_requests' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[n8n Start Webhook] UNCAUGHT ERROR:', error?.message);
        return NextResponse.json(
            { error: 'Internal server error processing webhook', detail: error?.message },
            { status: 500 }
        );
    }
}
