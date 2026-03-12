import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path, ...payload } = body;

        // Determine the target URL
        // If 'path' is provided (e.g. 'content-test' or 'content-test-original'), append it to the base URL
        // Otherwise use the default environment variable for production/dev
        let targetUrl = process.env.N8N_CONTENT_ENGINE_WEBHOOK_URL!;

        if (path) {
            // Assume N8N_BASE_URL is something like https://n8n.skywide.bg
            // We want to construct https://n8n.skywide.bg/webhook/content-test
            // But usually env var is the full webhook url. 
            // Let's assume N8N_BASE_URL is available or we can derive it.
            // Actually, safer to just use the env var base if available, or replace the last part of the default URL.
            const baseUrl = process.env.N8N_BASE_URL?.replace(/\/$/, '') || 'https://n8n.skywide.bg'; // Fallback or strict
            targetUrl = `${baseUrl}/webhook/${path}`;
        }

        // ── Pre-process database records using service role ───────────────
        if (payload.runId && payload.request_id && !payload.is_ab_test) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // 1. Create the run record first so it exists
            const { error: runError } = await supabase
                .from('content_runs')
                .insert([{
                    id: payload.runId,
                    content_request_id: payload.request_id,
                    status: 'running',
                    created_at: new Date().toISOString()
                }]);

            if (runError) {
                console.error('[Proxy-n8n] Failed to insert content_runs:', runError);
            } else {
                // 2. Update the parent request to point to this new run
                console.log(`[Proxy-n8n] ✅ Linking request ${payload.request_id} to run ${payload.runId}`);
                const { error: reqError } = await supabase
                    .from('content_requests')
                    .update({ current_run_id: payload.runId })
                    .eq('id', payload.request_id);

                if (reqError) {
                    console.error('[Proxy-n8n] Failed to update current_run_id:', reqError);
                }
            }
        }

        console.log(`[Proxy-n8n] 🚀 Sending to: ${targetUrl}`);
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.text();
        console.log(`[Proxy-n8n] 📥 Response (${response.status}):`, data.substring(0, 100));

        let json;
        try {
            json = JSON.parse(data);
        } catch {
            json = { message: data };
        }

        if (!response.ok) {
            console.error(`[Proxy-n8n] ❌ n8n Error (${response.status}):`, data);
            return NextResponse.json(json, { status: response.status });
        }

        return NextResponse.json(json);
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
