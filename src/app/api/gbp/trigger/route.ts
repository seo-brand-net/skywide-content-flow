import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/gbp/trigger
 * Fires the n8n GBP webhook for a client run.
 *
 * Body options:
 *   { client_id: string, location_id: 'all' }              → fires one webhook per active location
 *   { client_id: string, location_id: '<uuid>' }           → fires for that specific location only
 *   { client_id: string }                                  → fires once using client default topics tab
 *
 * Each webhook call receives: { client_id, location_id, tab_name }
 * n8n uses tab_name to read the correct sheet tab for that location.
 */
export async function POST(request: Request) {
    const body = await request.json();
    const { client_id, location_id } = body;

    if (!client_id) {
        return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_GBP_WEBHOOK_URL;
    if (!webhookUrl) {
        return NextResponse.json({ error: 'N8N_GBP_WEBHOOK_URL env var not set' }, { status: 500 });
    }

    try {
        // ── Build the list of locations to fire webhooks for ───────────────

        let locationsToRun: Array<{ id: string; location_name: string; sheet_tab_name: string | null }> = [];

        if (!location_id || location_id === 'all') {
            // Fetch all active locations for this client
            const { data: locations, error } = await supabaseAdmin
                .from('gbp_locations')
                .select('id, location_name, sheet_tab_name')
                .eq('gbp_client_id', client_id)
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (locations && locations.length > 0) {
                locationsToRun = locations;
            }
            // If no locations exist, fall through to single run with no location
        } else {
            // Single specific location
            const { data: loc, error } = await supabaseAdmin
                .from('gbp_locations')
                .select('id, location_name, sheet_tab_name')
                .eq('id', location_id)
                .single();

            if (error || !loc) {
                return NextResponse.json({ error: 'Location not found' }, { status: 404 });
            }
            locationsToRun = [loc];
        }

        // ── Fire webhooks ──────────────────────────────────────────────────

        if (locationsToRun.length === 0) {
            // Single-location client: fire one run with no location context
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id }),
            });

            if (!res.ok) {
                return NextResponse.json({ error: 'n8n webhook failed', status: res.status }, { status: 502 });
            }

            return NextResponse.json({ success: true, fired: 1 });
        }

        // Multi-location: fire concurrently, one webhook per location
        const results = await Promise.allSettled(
            locationsToRun.map(loc =>
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id,
                        location_id: loc.id,
                        tab_name: loc.sheet_tab_name, // n8n reads this tab from the spreadsheet
                    }),
                })
            )
        );

        const fired = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return NextResponse.json({
            success: true,
            fired,
            failed,
            locations: locationsToRun.map(l => l.location_name),
        });

    } catch (err: any) {
        console.error('[gbp/trigger] Unhandled error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
