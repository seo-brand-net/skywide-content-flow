import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper to update the database
export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('--- TEST CALLBACK RECEIVED ---');
        console.log('Body:', JSON.stringify(body, null, 2));

        const { request_id, audit_data, status: explicitStatus, content_markdown } = body;

        if (!request_id) {
            console.error('Callback error: Missing request_id');
            return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
        }

        console.log(`Processing callback for request: ${request_id} with status: ${explicitStatus || 'completed'}`);

        // Parse audit data if it's a string
        let processedAudit = audit_data;
        if (typeof audit_data === 'string') {
            try {
                processedAudit = JSON.parse(audit_data);
            } catch (e) {
                console.log('Audit data is string, not JSON');
            }
        }

        // Extract score if possible and ensure it's an integer for the DB
        const rawScore = processedAudit?.alignment_score || processedAudit?.score || 0;
        const score = Math.round(Number(rawScore));
        console.log(`Calculated rounded score: ${score} (raw: ${rawScore})`);

        // Update the database with the audit results using Admin client to bypass RLS
        const { data, error } = await supabaseAdmin
            .from('test_results')
            .update({
                audit_data: processedAudit,
                score: score,
                status: explicitStatus || 'completed',
                ...(content_markdown && { content_markdown })
            })
            .eq('request_id', request_id)
            .select();

        if (error) {
            console.error('Database update error in callback:', error);
            console.error('Attempted update with payload:', {
                request_id,
                score,
                status: explicitStatus || 'completed',
                has_content: !!content_markdown,
                content_length: content_markdown?.length
            });
            return NextResponse.json({
                error: error.message,
                details: error,
                hint: 'Check if all columns exist and types match.'
            }, { status: 500 });
        }

        if (!data || data.length === 0) {
            console.warn(`No row found in test_results for request_id: ${request_id}`);
            return NextResponse.json({
                success: false,
                error: 'No matching record found',
                request_id
            });
        } else {
            console.log(`Successfully updated test_results for ${request_id}`);
        }

        return NextResponse.json({ success: true, updated: data?.length || 0 });
    } catch (error: any) {
        console.error('Callback Error (Exception):', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
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
            .from('test_results')
            .select('audit_data, status, score, content_markdown')
            .eq('request_id', requestId)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({
            status: data.status,
            data: data.audit_data,
            score: data.score,
            content_markdown: data.content_markdown
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
