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

        // Concurrency Lock: Check for existing pending runs to avoid overlapping submissions
        if (indexing_client_id) {
            const { data: existingRuns, error: checkError } = await supabaseAdmin
                .from('indexing_runs')
                .select('id')
                .eq('indexing_client_id', indexing_client_id)
                .eq('status', 'pending');

            if (checkError) {
                console.error('[proxy-indexing-script] Failed to check for existing runs:', checkError);
            } else if (existingRuns && existingRuns.length > 0) {
                console.warn(`[proxy-indexing-script] Concurrency lock active for client ${indexing_client_id}`);
                return NextResponse.json(
                    { error: 'An indexing run is already in progress for this client. Please wait until it completes.' },
                    { status: 429 }
                );
            }
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

        // Call the Indexing Apps Script (synchronous — it returns results directly).
        // 290s timeout gives a safe buffer under Vercel's 300s function limit.
        // If the Apps Script hangs we clean up the DB run rather than leaving it 'pending'.
        console.log('[proxy-indexing-script] Calling Apps Script...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 290_000);

        let gasResponse: Response;
        try {
            gasResponse = await fetch(indexingAppsScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workbook_url,
                    tab_name: tab_name || 'Indexing Automation',
                    gsc_property,
                    bing_site_url: bing_site_url || null
                }),
                redirect: 'follow',
                signal: controller.signal
            });
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            const isTimeout = fetchErr?.name === 'AbortError';
            const errMsg = isTimeout
                ? 'Apps Script request timed out after 290 seconds'
                : fetchErr.message;
            console.error('[proxy-indexing-script] Fetch error:', errMsg);
            if (runId) {
                await updateRunRecordWithRetry(runId, { 
                    status: 'error', 
                    error_message: errMsg, 
                    completed_at: new Date().toISOString() 
                });
            }
            return NextResponse.json(
                { error: errMsg, run_id: runId },
                { status: isTimeout ? 504 : 502 }
            );
        } finally {
            clearTimeout(timeoutId);
        }

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
            if (gs && typeof gs === 'object') {
                mappedGoogleSummary = {
                    new_urls: gs.newUrls,
                    existing_urls: gs.existingUrls,
                    submitted: gs.submitted,
                    errors: gs.errors,
                    rate_limited: gs.rateLimited
                };
            }
            // If bing_site_url wasn't provided, explicitly ignore any mock data Apps Script returns
            const bs = gasData.summary.bing;
            if (bing_site_url && bs && typeof bs === 'object') {
                mappedBingSummary = {
                    new_urls: bs.newUrls,
                    existing_urls: bs.existingUrls,
                    submitted: bs.submitted,
                    errors: bs.errors,
                    rate_limited: bs.rateLimited
                };
            }
        }

        // Update the run record with results, using retry backoff logic
        if (runId) {
            await updateRunRecordWithRetry(runId, {
                status: isSuccess ? 'success' : 'error',
                google_summary: mappedGoogleSummary,
                bing_summary: mappedBingSummary,
                error_message: isSuccess ? null : (gasData?.error || gasData?.message || 'Apps Script returned an error'),
                error_details: isSuccess ? null : gasData,
                completed_at: new Date().toISOString()
            });
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
            await updateRunRecordWithRetry(runId, {
                status: 'error',
                error_message: error.message,
                completed_at: new Date().toISOString()
            });
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

/**
 * Robust retry wrapper for Supabase final `.update()` operations.
 * Protects against transient database disconnects resulting in corrupted "split-brain" runs 
 * where Apps Script succeeded but the DB record remained "pending" indefinitely.
 */
async function updateRunRecordWithRetry(runId: string, payload: any, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const { error } = await supabaseAdmin
            .from('indexing_runs')
            .update(payload)
            .eq('id', runId);
            
        if (!error) return true;
        
        if (attempt === retries) {
            console.error(`[proxy-indexing-script] Max retries (${retries}) reached for updating run ${runId}:`, error);
            return false;
        }
        
        // Exponential backoff: 2s, 4s...
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`[proxy-indexing-script] Supabase update fail (attempt ${attempt}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return false;
}
