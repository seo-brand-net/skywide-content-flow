import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch('https://n8n-6v8fm-u36794.vm.elestio.app/webhook/70436a30-ecd4-4896-bedc-b52bbfd37f65', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Upstream error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data);
    } catch (error) {
        console.error('Research Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
