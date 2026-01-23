import { createRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const body = await request.json();

        const { run_id, action } = body; // action: 'pause' | 'resume' | 'stop'

        if (!run_id || !action) {
            return NextResponse.json(
                { error: 'run_id and action are required' },
                { status: 400 }
            );
        }

        if (!['pause', 'resume', 'stop'].includes(action)) {
            return NextResponse.json(
                { error: 'action must be one of: pause, resume, stop' },
                { status: 400 }
            );
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate user owns this run
        const { data: run } = await supabase
            .from('content_runs')
            .select(`
        id,
        content_request_id,
        content_requests!inner(user_id)
      `)
            .eq('id', run_id)
            .single();

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';
        const isOwner = run.content_requests.user_id === user.id;

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Update run status
        const statusMap: Record<string, string> = {
            'pause': 'paused',
            'resume': 'running',
            'stop': 'stopped'
        };

        const newStatus = statusMap[action];
        const updateData: any = { status: newStatus };

        // If stopping, mark as completed
        if (action === 'stop') {
            updateData.completed_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
            .from('content_runs')
            .update(updateData)
            .eq('id', run_id);

        if (updateError) {
            console.error('Error updating run status:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // If stopped, also update the content request status
        if (action === 'stop') {
            await supabase
                .from('content_requests')
                .update({ status: 'cancelled' })
                .eq('current_run_id', run_id);
        }

        return NextResponse.json({
            success: true,
            status: newStatus
        });

    } catch (error: any) {
        console.error('Unexpected error in control run:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
