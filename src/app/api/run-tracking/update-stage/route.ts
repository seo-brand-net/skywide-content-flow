import { createRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const body = await request.json();

        const {
            run_id,
            stage_name,
            stage_order,
            status,
            output_text,
            output_metadata,
            error_message
        } = body;

        if (!run_id || !stage_name || stage_order === undefined) {
            return NextResponse.json(
                { error: 'run_id, stage_name, and stage_order are required' },
                { status: 400 }
            );
        }

        // Calculate duration if transitioning from running to completed/failed
        const now = new Date().toISOString();
        const stageData: any = {
            run_id,
            stage_name,
            stage_order,
            status,
            output_text,
            output_metadata,
            error_message
        };

        if (status === 'running') {
            stageData.started_at = now;
        } else if (status === 'completed' || status === 'failed') {
            stageData.completed_at = now;

            // Calculate duration if we have a started_at time
            const { data: existingStage } = await supabase
                .from('content_run_stages')
                .select('started_at')
                .eq('run_id', run_id)
                .eq('stage_name', stage_name)
                .single();

            if (existingStage?.started_at) {
                const startTime = new Date(existingStage.started_at).getTime();
                const endTime = new Date(now).getTime();
                stageData.duration_ms = endTime - startTime;
            }
        }

        // Upsert stage record (update if exists, insert if not)
        const { error: stageError } = await supabase
            .from('content_run_stages')
            .upsert(stageData, {
                onConflict: 'run_id, stage_name',
                ignoreDuplicates: false
            });

        if (stageError) {
            console.error('Error upserting stage:', stageError);
            return NextResponse.json({ error: stageError.message }, { status: 500 });
        }

        // Update run record with current stage and completed count
        const { data: stages } = await supabase
            .from('content_run_stages')
            .select('status')
            .eq('run_id', run_id);

        const completed = stages?.filter(s => s.status === 'completed').length || 0;
        const hasFailed = stages?.some(s => s.status === 'failed');

        const runUpdate: any = {
            current_stage: stage_name,
            completed_stages: completed
        };

        // If this is the last stage and it completed, mark run as completed
        if (completed >= 19) {
            runUpdate.status = 'completed';
            runUpdate.completed_at = now;
        } else if (hasFailed) {
            runUpdate.status = 'failed';
            runUpdate.completed_at = now;
        }

        await supabase
            .from('content_runs')
            .update(runUpdate)
            .eq('id', run_id);

        // If run is completed or failed, update the content request status
        if (runUpdate.status === 'completed') {
            await supabase
                .from('content_requests')
                .update({ status: 'completed' })
                .eq('current_run_id', run_id);
        } else if (runUpdate.status === 'failed') {
            await supabase
                .from('content_requests')
                .update({ status: 'failed' })
                .eq('current_run_id', run_id);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Unexpected error in update stage:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
