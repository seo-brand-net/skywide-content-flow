import { NextResponse } from 'next/server';

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
