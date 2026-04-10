import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    let runId: string | null = null;

    try {
        const body = await request.json();
        const { indexing_client_id, workbook_url, tab_name, gsc_property, bing_site_url, user_id } = body;

        console.log('[proxy-indexing-script] Incoming request:', {
            indexing_client_id,
            gsc_property,
            hasBing: !!bing_site_url,
            user_id: user_id || 'none (scheduled)'
        });

        const indexingAppsScriptUrl = process.env.INDEXING_APPS_SCRIPT_URL;

        if (!indexingAppsScriptUrl) {
            console.error('[proxy-indexing-script] INDEXING_APPS_SCRIPT_URL is not configured');
            return NextResponse.json(
                { error: 'Indexing Apps Script URL not configured. Set INDEXING_APPS_SCRIPT_URL in environment variables.' },
                { status: 500 }
            );
        }

        // Create a pending run record in the DB before calling the script
        if (indexing_client_id) {
            const { data: run, error: insertError } = await supabaseAdmin
                .from('indexing_runs')
                .insert([{
                    indexing_client_id,
                    triggered_by: body.triggered_by || 'manual',
                    status: 'pending',
                    ...(user_id ? { user_id } : {})
                }])
                .select('id')
                .single();

            if (insertError) {
                console.error('[proxy-indexing-script] Failed to create run record:', insertError);
            } else {
                runId = run.id;
            }
        }

        // Call the Indexing Apps Script (synchronous — it returns results directly)
        console.log('[proxy-indexing-script] Calling Apps Script...');
        const gasResponse = await fetch(indexingAppsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workbook_url,
                tab_name: tab_name || 'Indexing Automation',
                gsc_property,
                bing_site_url: bing_site_url || null
            }),
            redirect: 'follow'
        });

        const rawText = await gasResponse.text();
        let gasData: any;

        try {
            gasData = JSON.parse(rawText);
        } catch {
            gasData = { status: 'error', message: rawText };
        }

        console.log('[proxy-indexing-script] Apps Script response:', gasData);

        // Determine overall status
        const isSuccess = gasResponse.ok && gasData?.status !== 'error' && gasData?.success !== false;

        // Map payload format to our DB schema
        let mappedGoogleSummary = null;
        let mappedBingSummary = null;

        if (gasData?.summary) {
            const gs = gasData.summary.google;
            if (gs) {
                mappedGoogleSummary = {
                    new_urls: gs.newUrls,
                    existing_urls: gs.existingUrls,
                    submitted: gs.submitted,
                    errors: gs.errors,
                    rate_limited: gs.rateLimited
                };
            }
            const bs = gasData.summary.bing;
            if (bs && typeof bs === 'object') {
                mappedBingSummary = {
                    new_urls: bs.newUrls,
                    existing_urls: bs.existingUrls,
                    submitted: bs.submitted,
                    errors: bs.errors,
                    rate_limited: bs.rateLimited
                };
            }
        }

        // Update the run record with results
        if (runId) {
            await supabaseAdmin
                .from('indexing_runs')
                .update({
                    status: isSuccess ? 'success' : 'error',
                    google_summary: mappedGoogleSummary,
                    bing_summary: mappedBingSummary,
                    error_message: isSuccess ? null : (gasData?.error || gasData?.message || 'Apps Script returned an error'),
                    error_details: isSuccess ? null : gasData,
                    completed_at: new Date().toISOString()
                })
                .eq('id', runId);
        }

        if (!isSuccess) {
            return NextResponse.json(
                {
                    error: 'Indexing Apps Script returned an error',
                    message: gasData?.error || gasData?.message || 'Unknown error',
                    details: gasData,
                    run_id: runId
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            run_id: runId,
            google_summary: mappedGoogleSummary,
            bing_summary: mappedBingSummary,
            message: 'Indexing completed successfully'
        });

    } catch (error: any) {
        console.error('[proxy-indexing-script] Unhandled error:', error);

        // Mark the run as errored if we have a run ID
        if (runId) {
            await supabaseAdmin
                .from('indexing_runs')
                .update({
                    status: 'error',
                    error_message: error.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', runId);
        }

        return NextResponse.json(
            {
                error: 'Internal Server Error in Indexing Proxy',
                message: error.message,
                run_id: runId
            },
            { status: 500 }
        );
    }
}
