import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Indexing Automation Cron Job
 * 
 * Runs daily at 3:00 AM UTC (0 3 * * * in vercel.json).
 * Filters clients whose last_run_at is >= 14 days ago (or never run).
 * Processes clients sequentially to respect per-client API quotas.
 * 
 * Secured via Authorization: Bearer <CRON_SECRET> header.
 * Vercel automatically sends this header when invoking cron routes.
 * For manual testing: pass the header explicitly.
 */
export async function GET(request: Request) {
    // Validate via Authorization header (Vercel's recommended cron auth pattern).
    // Keeps the secret out of URLs, query params, and server logs.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

        // Run all clients concurrently to drastically reduce total cron duration
        // This prevents 5 clients taking 60s each from hitting Vercel's 300s timeout ceiling
        const processingPromises = dueClients.map(async (client) => {
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

                // Determine if we should update last_run_at to today (which delays the next run by 14 days).
                // Rule 1: Always delay if it's a success AND no URLs were rate-limited.
                // Rule 2: Delay if it's an "execution limit" error, as requested by Mike.
                // Rule 3: For all other errors (or if rate_limited > 0), DO NOT update last_run_at so it runs again tomorrow.
                const isSuccess = response.ok;
                const errorStr = String(result.error || result.message || '').toLowerCase();
                const isExecutionLimitError = errorStr.includes('execution time') || 
                                              errorStr.includes('execution limit') || 
                                              errorStr.includes('timeout');
                
                const googleRateLimited = result.google_summary?.rate_limited || 0;
                const bingRateLimited = result.bing_summary?.rate_limited || 0;
                const hasRateLimitedUrls = googleRateLimited > 0 || bingRateLimited > 0;

                const shouldUpdateLastRunAt = (isSuccess && !hasRateLimitedUrls) || (!isSuccess && isExecutionLimitError);

                if (shouldUpdateLastRunAt) {
                    await supabaseAdmin
                        .from('indexing_clients')
                        .update({ last_run_at: new Date().toISOString() })
                        .eq('id', client.id);
                } else {
                    console.log(`[cron/indexing-automation] Not updating last_run_at for ${client.name} (Retrying tomorrow). Success: ${isSuccess}, RateLimited: ${hasRateLimitedUrls}, Error: ${result.error || result.message}`);
                }

                if (!response.ok) {
                    console.error(`[cron/indexing-automation] Failed for ${client.name}:`, result);
                    return {
                        client_id: client.id,
                        client_name: client.name,
                        status: 'error' as const,
                        error: result.message || result.error || 'Proxy returned non-200'
                    };
                }

                console.log(`[cron/indexing-automation] ✓ ${client.name} indexed successfully`);
                return {
                    client_id: client.id,
                    client_name: client.name,
                    status: 'success' as const,
                    run_id: result.run_id
                };

            } catch (clientError: any) {
                console.error(`[cron/indexing-automation] Exception for ${client.name}:`, clientError);
                
                const errStr = String(clientError.message || '').toLowerCase();
                const isExecLimit = errStr.includes('execution time') || errStr.includes('execution limit') || errStr.includes('timeout');
                
                if (isExecLimit) {
                    await supabaseAdmin
                        .from('indexing_clients')
                        .update({ last_run_at: new Date().toISOString() })
                        .eq('id', client.id)
                        .then(() => {}); // fire-and-forget
                } else {
                    console.log(`[cron/indexing-automation] Not updating last_run_at for exception on ${client.name} (Retrying tomorrow). Error: ${clientError.message}`);
                }
                
                return {
                    client_id: client.id,
                    client_name: client.name,
                    status: 'error' as const,
                    error: clientError.message
                };
            }
        });

        // Wait for all fetches to securely resolve
        const settledResults = await Promise.allSettled(processingPromises);
        
        // Extract out the mapped objects
        const results = settledResults.map(res => 
            res.status === 'fulfilled' 
                ? res.value 
                : { client_id: 'unknown', client_name: 'Unknown', status: 'error' as const, error: String(res.reason) }
        );

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
