import { createRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { pollN8nExecution } from '@/services/n8n-poller';

export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const body = await request.json();

        const { content_request_id, n8n_execution_id } = body;

        if (!content_request_id) {
            return NextResponse.json(
                { error: 'content_request_id is required' },
                { status: 400 }
            );
        }

        // Create run record
        const { data: run, error } = await supabase
            .from('content_runs')
            .insert({
                content_request_id,
                n8n_execution_id,
                status: 'running',
                current_stage: 'Webhook Received',
                completed_stages: 0,
                total_stages: 19
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating run:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update content_request with current_run_id and set status to in_progress
        const { error: updateError } = await supabase
            .from('content_requests')
            .update({
                current_run_id: run.id,
                status: 'in_progress'
            })
            .eq('id', content_request_id);

        if (updateError) {
            console.error('Error updating content request:', updateError);
        }

        // Start polling n8n execution in background (if execution ID provided)
        if (n8n_execution_id) {
            // Start polling asynchronously (don't await)
            pollN8nExecution(n8n_execution_id, run.id).catch(error => {
                console.error('Error in n8n polling:', error);
            });
        }

        return NextResponse.json({
            success: true,
            run_id: run.id
        });

    } catch (error: any) {
        console.error('Unexpected error in create run:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
