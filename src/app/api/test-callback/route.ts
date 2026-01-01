import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to update the database
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { request_id, audit_data } = body;

        if (!request_id) {
            return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
        }

        console.log(`Received test callback for request: ${request_id}`);

        // Update the database with the audit results
        const { error } = await supabase
            .from('content_requests')
            .update({
                webhook_response: audit_data,
                webhook_sent: true,
                status: 'complete'
            })
            .eq('id', request_id);

        if (error) {
            console.error('Database update error in callback:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Callback Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper to poll for the result
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');

    if (!requestId) {
        return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('content_requests')
            .select('webhook_response, status')
            .eq('id', requestId)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({
            status: data.status,
            data: data.webhook_response
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
