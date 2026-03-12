import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { runId, executionId, requestId } = body;

        console.log(`[n8n Start Webhook] Received runId: ${runId}, executionId: ${executionId}, requestId: ${requestId}`);

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

        // ── Determine the parent content_request_id ───────────────────────
        let finalRequestId = requestId;

        if (!finalRequestId) {
            const { data: contentRequest } = await supabase
                .from('content_requests')
                .select('id')
                .eq('current_run_id', runId)
                .single();
            
            finalRequestId = contentRequest?.id;
        }

        if (!finalRequestId) {
            console.warn(`[n8n Start Webhook] Could not resolve request_id for runId ${runId} — attempting bare update`);
            await supabase
                .from('content_runs')
                .update({ n8n_execution_id: executionId, status: 'running' })
                .eq('id', runId);
            return NextResponse.json({ success: true, method: 'fallback_update' });
        }

        // ── Upsert the content_runs row ───────────────────────────────────
        const { error } = await supabase
            .from('content_runs')
            .upsert({
                id: runId,
                content_request_id: finalRequestId,
                n8n_execution_id: executionId,
                status: 'running',
                created_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (error) {
            console.error('[n8n Start Webhook] Error upserting content_runs:', error);
            return NextResponse.json({ error: 'Failed to upsert content_runs' }, { status: 500 });
        }

        console.log(`[n8n Start Webhook] ✅ Upserted run ${runId} → execution ${executionId} for request ${finalRequestId}`);
        return NextResponse.json({ success: true, requestId: finalRequestId });

    } catch (error: any) {
        console.error('[n8n Start Webhook] UNCAUGHT ERROR:', error?.message);
        return NextResponse.json(
            { error: 'Internal server error processing webhook', detail: error?.message },
            { status: 500 }
        );
    }
}
