import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const n8nApiKey = process.env.N8N_API_KEY!;
const n8nBaseUrl = process.env.N8N_BASE_URL!;

export async function POST(request: Request) {
    try {
        const { requestId } = await request.json();

        if (!requestId) {
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        // 1. Get the request and its execution ID
        const { data: contentReq, error: reqError } = await supabaseAdmin
            .from('content_requests')
            .select('n8n_execution_id, status')
            .eq('id', requestId)
            .single();

        if (reqError || !contentReq?.n8n_execution_id) {
            console.error(`Retry failed for request ${requestId}: No execution ID found`, reqError);
            return NextResponse.json({ 
                error: 'Could not find an execution ID to retry.',
                detail: reqError ? reqError.message : 'The n8n_execution_id column is empty for this request. Was the workflow started recently with the updated tracking code?',
                requestId
            }, { status: 404 });
        }

        console.log(`[Retry] Attempting to retry n8n execution ${contentReq.n8n_execution_id} for request ${requestId}`);

        // 2. Call n8n API to retry
        const response = await fetch(`${n8nBaseUrl}/api/v1/executions/${contentReq.n8n_execution_id}/retry`, {
            method: 'POST',
            headers: {
                'X-N8N-API-KEY': n8nApiKey,
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[Retry] n8n API failed:', errorData);
            return NextResponse.json({ error: 'n8n failed to retry the execution', detail: errorData }, { status: response.status });
        }

        const n8nData = await response.json();
        const newExecutionId = n8nData.data?.executionId;

        // 3. Update the content request with the new execution ID and status
        const { error: updateError } = await supabaseAdmin
            .from('content_requests')
            .update({ 
                status: 'in_progress',
                n8n_execution_id: newExecutionId,
                error_message: null 
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('[Retry] Error updating request record:', updateError);
        }

        return NextResponse.json({ success: true, executionId: newExecutionId });

    } catch (error: any) {
        console.error('[Retry] Uncaught error:', error);
        return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
    }
}
