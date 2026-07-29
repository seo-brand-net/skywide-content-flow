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
        .from('clients')
        .select('id, name, industry, key_selling_point, sitemap_url, gbp_sheet_id, gbp_topics_tab_name, gbp_enabled')
        .eq('id', clientId)
        .eq('gbp_enabled', true)
        .single();

    if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Ensure we only return the ID, even if a full URL was saved in the DB
    let finalSheetId = client.gbp_sheet_id;
    if (finalSheetId && finalSheetId.includes('/spreadsheets/d/')) {
        const match = finalSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
            finalSheetId = match[1];
        }
    }

    const { data: locations, error: locError } = await supabaseAdmin
        .from('client_locations')
        .select('id, location_name, city, state, sheet_tab_name, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (locError) {
        return NextResponse.json({ error: locError.message }, { status: 500 });
    }

    // Keep response field names (`sheet_id`, `topics_tab_name`) stable — n8n reads these by name.
    const { gbp_sheet_id, gbp_topics_tab_name, gbp_enabled, ...rest } = client;
    return NextResponse.json({
        ...rest,
        sheet_id: finalSheetId,
        topics_tab_name: gbp_topics_tab_name,
        is_active: gbp_enabled,
        locations: locations || [],
    });
}
