import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Pusher from 'pusher';

const pusher = new Pusher({
    appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

export async function GET(request: Request) {
    // Validate via Authorization header (Vercel's recommended cron auth pattern).
    // Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when invoking
    // cron routes -- the previous `?secret=` query-param check never matched because
    // vercel.json's cron `path` carries no query string, so this route 401'd on every
    // single scheduled invocation and never actually swept anything.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find rows that have been "IN_PROGRESS" for more than 10 minutes
        // (Google Apps Script strict timeout is 6 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const { data: staleRows, error: fetchError } = await supabaseAdmin
            .from('workbook_rows')
            .select('*')
            .eq('status', 'IN_PROGRESS')
            .lt('updated_at', tenMinutesAgo);

        if (fetchError) {
            console.error('Error fetching stale rows:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch stale rows' }, { status: 500 });
        }

        if (!staleRows || staleRows.length === 0) {
            return NextResponse.json({ success: true, message: 'No stale rows found.' });
        }

        const staleIds = staleRows.map(row => row.id);
        const timeoutNotes = 'Engine Timeout: The generation engine exceeded its execution limit or crashed silently. Please restart.';

        // Update these zombie rows to ERROR
        const { error: updateError } = await supabaseAdmin
            .from('workbook_rows')
            .update({
                status: 'ERROR',
                notes: timeoutNotes,
                updated_at: new Date().toISOString()
            })
            .in('id', staleIds);

        if (updateError) {
            console.error('Error updating stale rows:', updateError);
            return NextResponse.json({ error: 'Failed to update stale rows' }, { status: 500 });
        }

        // Broadcast to Pusher so UI instantly stops spinning globally
        for (const row of staleRows) {
            try {
                const pusherPayload = {
                    id: row.id,
                    client_id: row.client_id,
                    primary_keyword: row.primary_keyword,
                    status: 'ERROR',
                    notes: timeoutNotes,
                    user_id: row.user_id,
                    secondary_keyword: row.secondary_keyword,
                    longtail_keywords: row.longtail_keywords
                };

                await pusher.trigger(`client-${row.client_id}`, 'brief-status-update', pusherPayload);
                await pusher.trigger('content-briefs-activity', 'brief-status-update', pusherPayload);
            } catch (err) {
                console.error(`Failed to push timeout update for row ${row.id}`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully swept ${staleRows.length} stale row(s).`,
            swept_ids: staleIds
        });
    } catch (e: any) {
        return NextResponse.json({ error: 'Internal Server Error', message: e.message }, { status: 500 });
    }
}
