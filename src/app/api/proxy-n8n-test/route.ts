import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // ── Pre-process database records using service role ───────────────
        if (body.runId && body.request_id && !body.is_ab_test) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            console.log(`[Proxy-n8n-test] 🗄️ Initializing run ${body.runId} for request ${body.request_id}`);

            // 1. Create the run record
            const { error: runError } = await supabase
                .from('content_runs')
                .insert([{
                    id: body.runId,
                    content_request_id: body.request_id,
                    status: 'running',
                    created_at: new Date().toISOString()
                }]);

            if (runError) {
                console.error('[Proxy-n8n-test] Failed to insert content_runs:', runError);
            } else {
                // 2. Update the parent request
                const { error: reqError } = await supabase
                    .from('content_requests')
                    .update({ current_run_id: body.runId })
                    .eq('id', body.request_id);
                
                if (reqError) {
                    console.error('[Proxy-n8n-test] Failed to update current_run_id:', reqError);
                }
            }
        }

        console.log(`[Proxy-n8n-test] 🚀 Sending to test webhook...`);
        const response = await fetch(process.env.N8N_TEST_WEBHOOK_URL!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.text();
        let json;
        try {
            json = JSON.parse(data);
        } catch {
            json = { message: data };
        }

        if (!response.ok) {
            console.error(`n8n Test Error (${response.status}):`, data);
            return NextResponse.json(json, { status: response.status });
        }

        return NextResponse.json(json);
    } catch (error) {
        console.error('Test Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
