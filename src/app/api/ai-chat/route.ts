import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const authHeader = req.headers.get('authorization');

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            return NextResponse.json(
                { error: 'Supabase URL not configured' },
                { status: 500 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
        const functionUrl = `${supabaseUrl}/functions/v1/ai-rewrite-chat`;

        console.log('[API Proxy] Forwarding to:', functionUrl);

        // Forward request to Supabase Edge Function
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader || '',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API Proxy] Upstream error:', response.status, errorText);
            try {
                // Try to parse as JSON if possible
                const errorJson = JSON.parse(errorText);
                return NextResponse.json(errorJson, { status: response.status });
            } catch {
                return NextResponse.json({ error: errorText }, { status: response.status });
            }
        }

        // Stream the response back
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
