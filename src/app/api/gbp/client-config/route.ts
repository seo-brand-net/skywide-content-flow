import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/gbp/client-config?client_id=<uuid>
 * Used by n8n to fetch client details + locations dynamically,
 * replacing the hardcoded "Edit Fields" node in the workflow.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
        return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const { data: client, error: clientError } = await supabaseAdmin
        .from('gbp_clients')
        .select('id, name, industry, sitemap_url, key_selling_point, sheet_id, topics_tab_name, is_active')
        .eq('id', clientId)
        .single();

    if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { data: locations, error: locError } = await supabaseAdmin
        .from('gbp_locations')
        .select('id, location_name, city, state, sheet_tab_name, is_active')
        .eq('gbp_client_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (locError) {
        return NextResponse.json({ error: locError.message }, { status: 500 });
    }

    return NextResponse.json({ ...client, locations: locations || [] });
}
