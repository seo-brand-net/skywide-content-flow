import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/gbp/topics?client_id=<uuid>&status=NEW
 * n8n fetches queued topics for a given client.
 *
 * PATCH /api/gbp/topics
 * n8n updates topic status (IN_PROGRESS → DONE).
 * Body: { id: string, status: 'IN_PROGRESS' | 'DONE' }
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status') || 'NEW';

    if (!clientId) {
        return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const query = supabaseAdmin
        .from('gbp_topics')
        .select('id, topic, status, location_id, gbp_locations(location_name, city, state)')
        .eq('gbp_client_id', clientId)
        .eq('status', status)
        .order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ topics: data || [] });
}

export async function PATCH(request: Request) {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
        return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const validStatuses = ['IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('gbp_topics')
        .update({ status })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
