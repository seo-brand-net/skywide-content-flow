import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Indexing Automation Cron Job
 * 
 * Runs daily at 3:00 AM UTC (0 3 * * * in vercel.json).
 * Filters clients whose last_run_at is >= 14 days ago (or never run).
 * Processes clients sequentially to respect per-client API quotas.
 * 
 * Secured with: ?secret=GAS_CALLBACK_SECRET
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

    // Validate the secret to prevent unauthorized triggers
    if (process.env.GAS_CALLBACK_SECRET && secret !== process.env.GAS_CALLBACK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    try {
        console.log('[cron/indexing-automation] Starting daily indexing check...');

        // Find all active clients that are due for indexing (never run OR >= 14 days ago)
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        const { data: dueClients, error: fetchError } = await supabaseAdmin
            .from('indexing_clients')
            .select('id, name, workbook_url, tab_name, gsc_property, bing_site_url, last_run_at')
            .eq('is_active', true)
            .or(`last_run_at.is.null,last_run_at.lt.${fourteenDaysAgo}`);

        if (fetchError) {
            console.error('[cron/indexing-automation] Failed to fetch due clients:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch due clients', details: fetchError }, { status: 500 });
        }

        if (!dueClients || dueClients.length === 0) {
            console.log('[cron/indexing-automation] No clients due for indexing today.');
            return NextResponse.json({
                success: true,
                message: 'No clients due for indexing today.',
                processed: 0
            });
        }

        console.log(`[cron/indexing-automation] Found ${dueClients.length} client(s) due for indexing:`, 
                    dueClients.map(c => c.name));

        const results: Array<{
            client_id: string;
            client_name: string;
            status: 'success' | 'error';
            run_id?: string;
            error?: string;
        }> = [];

        // Process clients sequentially to respect per-client API quotas
        for (const client of dueClients) {
            console.log(`[cron/indexing-automation] Processing: ${client.name}`);

            try {
                const response = await fetch(`${baseUrl}/api/proxy-indexing-script`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        indexing_client_id: client.id,
                        workbook_url: client.workbook_url,
                        tab_name: client.tab_name,
                        gsc_property: client.gsc_property,
                        bing_site_url: client.bing_site_url,
                        triggered_by: 'scheduled'
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error(`[cron/indexing-automation] Failed for ${client.name}:`, result);
                    results.push({
                        client_id: client.id,
                        client_name: client.name,
                        status: 'error',
                        error: result.message || 'Proxy returned non-200'
                    });
                    // Continue to next client — don't let one failure block others
                    continue;
                }

                // Update last_run_at on success
                await supabaseAdmin
                    .from('indexing_clients')
                    .update({ last_run_at: new Date().toISOString() })
                    .eq('id', client.id);

                results.push({
                    client_id: client.id,
                    client_name: client.name,
                    status: 'success',
                    run_id: result.run_id
                });

                console.log(`[cron/indexing-automation] ✓ ${client.name} indexed successfully`);

            } catch (clientError: any) {
                console.error(`[cron/indexing-automation] Exception for ${client.name}:`, clientError);
                results.push({
                    client_id: client.id,
                    client_name: client.name,
                    status: 'error',
                    error: clientError.message
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        console.log(`[cron/indexing-automation] Done. ${successCount} succeeded, ${errorCount} failed.`);

        return NextResponse.json({
            success: true,
            message: `Processed ${dueClients.length} client(s): ${successCount} succeeded, ${errorCount} failed.`,
            processed: dueClients.length,
            success_count: successCount,
            error_count: errorCount,
            results
        });

    } catch (e: any) {
        console.error('[cron/indexing-automation] Unhandled error:', e);
        return NextResponse.json(
            { error: 'Internal Server Error', message: e.message },
            { status: 500 }
        );
    }
}
