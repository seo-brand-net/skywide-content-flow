import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { run_id, executionId, request_id } = body;

        console.log(`[n8n Start Webhook] Received run_id: ${run_id}, executionId: ${executionId}, request_id: ${request_id}`);

        if (!run_id || !executionId) {
            return NextResponse.json(
                { error: 'Missing run_id or executionId' },
                { status: 400 }
            );
        }

        // Use service role client to bypass RLS
        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // ── Determine the parent content_request_id ───────────────────────
        let finalRequestId = request_id;

        if (!finalRequestId) {
            const { data: contentRequest } = await supabase
                .from('content_requests')
                .select('id')
                .eq('current_run_id', run_id)
                .single();
            
            finalRequestId = contentRequest?.id;
        }

        if (!finalRequestId) {
            console.warn(`[n8n Start Webhook] Could not resolve request_id for run_id ${run_id} — attempting bare update`);
            await supabase
                .from('content_runs')
                .update({ n8n_execution_id: executionId, status: 'running' })
                .eq('id', run_id);
            return NextResponse.json({ success: true, method: 'fallback_update' });
        }

        // ── Upsert the content_runs row ───────────────────────────────────
        const { error } = await supabase
            .from('content_runs')
            .upsert({
                id: run_id,
                content_request_id: finalRequestId,
                n8n_execution_id: executionId,
                status: 'running',
                created_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (error) {
            console.error('[n8n Start Webhook] Error upserting content_runs:', error);
            return NextResponse.json({ error: 'Failed to upsert content_runs' }, { status: 500 });
        }

        // Also update the parent request to confirm it is in progress and remap current_run_id
        await supabase
            .from('content_requests')
            .update({ 
                status: 'in_progress',
                current_run_id: run_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', finalRequestId);

        console.log(`[n8n Start Webhook] ✅ Upserted run ${run_id} → execution ${executionId} for request ${finalRequestId}`);
        return NextResponse.json({ success: true, request_id: finalRequestId });

    } catch (error: any) {
        console.error('[n8n Start Webhook] UNCAUGHT ERROR:', error?.message);
        return NextResponse.json(
            { error: 'Internal server error processing webhook', detail: error?.message },
            { status: 500 }
        );
    }
}
