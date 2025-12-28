import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

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
