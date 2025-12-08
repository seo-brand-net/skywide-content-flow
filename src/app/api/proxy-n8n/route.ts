import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch('https://seobrand.app.n8n.cloud/webhook/content-engine-dev', {
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
            console.error(`n8n Error (${response.status}):`, data);
            return NextResponse.json(json, { status: response.status });
        }

        return NextResponse.json(json);
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
