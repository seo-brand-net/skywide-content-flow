import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { runId, executionId } = body;

        console.log(`[n8n Start Webhook] Received runId: ${runId}, executionId: ${executionId}`);

        if (!runId || !executionId) {
            return NextResponse.json(
                { error: 'Missing runId or executionId' },
                { status: 400 }
            );
        }

        // Use service role client to bypass RLS
        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Update the content_runs table with the n8n execution ID
        const { error } = await supabase
            .from('content_runs')
            .update({
                n8n_execution_id: executionId,
                updated_at: new Date().toISOString()
            })
            .eq('id', runId);

        if (error) {
            console.error('[n8n Start Webhook] Error updating content_runs:', error);
            return NextResponse.json({ error: 'Failed to update content_runs' }, { status: 500 });
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
