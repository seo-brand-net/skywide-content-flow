import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, client_id, primary_keyword, status, brief_url, brief_data, quality_score, run_id, notes, secret } = body;

        // Security check
        const expectedSecret = process.env.GAS_CALLBACK_SECRET;
        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!client_id || !primary_keyword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`Callback received for keyword: ${primary_keyword}, Status: ${status}, ID: ${id || 'NEW'}`);

        const payload = {
            client_id,
            primary_keyword,
            status: status || 'DONE',
            brief_url,
            brief_data,
            quality_score,
            run_id,
            notes,
            updated_at: new Date().toISOString()
        };

        let error;

        if (id) {
            // Row has an ID: Update the existing record
            const { error: updateError } = await supabaseAdmin
                .from('workbook_rows')
                .update(payload)
                .eq('id', id);
            error = updateError;
        } else {
            // New row: Insert a new record (DB will generate the ID)
            const { error: insertError } = await supabaseAdmin
                .from('workbook_rows')
                .insert(payload);
            error = insertError;
        }

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

