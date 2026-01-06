import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, client_id, primary_keyword, status, brief_url, brief_data, run_id, notes, secret } = body;

        // Security check
        const expectedSecret = process.env.GAS_CALLBACK_SECRET;
        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!client_id || !primary_keyword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`Callback received for keyword: ${primary_keyword}, Status: ${status}`);

        const { error } = await supabaseAdmin
            .from('workbook_rows')
            .upsert({
                id, // Use the ID provided by Apps Script for stable run tracking
                client_id,
                primary_keyword,
                status: status || 'DONE',
                brief_url,
                brief_data,
                run_id,
                notes,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.error('Database update error:', error);
            return NextResponse.json({ error: 'Database update failed', details: error }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Database updated successfully' });
    } catch (error: any) {
        console.error('Callback error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
