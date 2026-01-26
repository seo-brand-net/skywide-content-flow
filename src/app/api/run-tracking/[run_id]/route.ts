import { createRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ run_id: string }> }
) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { run_id } = await params;

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch run data with authorization check
        const { data: run, error: runError } = await supabase
            .from('content_runs')
            .select(`
        *,
        content_requests!inner(
          id,
          user_id,
          article_title,
          client_name
        )
      `)
            .eq('id', run_id)
            .single();

        if (runError || !run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        // Check authorization
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

        // Fetch stages for this run
        const { data: stages, error: stagesError } = await supabase
            .from('content_run_stages')
            .select('*')
            .eq('run_id', run_id)
            .order('stage_order', { ascending: true });

        if (stagesError) {
            console.error('Error fetching stages:', stagesError);
            return NextResponse.json({ error: stagesError.message }, { status: 500 });
        }

        return NextResponse.json({
            run,
            stages: stages || []
        });

    } catch (error: any) {
        console.error('Unexpected error fetching run:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
