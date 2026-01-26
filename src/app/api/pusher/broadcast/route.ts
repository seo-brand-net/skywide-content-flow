import Pusher from 'pusher';
import { NextRequest, NextResponse } from 'next/server';

const pusher = new Pusher({
    appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clientId, briefUpdate } = body;

        if (!clientId || !briefUpdate) {
            return NextResponse.json(
                { error: 'Missing clientId or briefUpdate' },
                { status: 400 }
            );
        }

        // Broadcast to client-specific channel
        await pusher.trigger(`client-${clientId}`, 'brief-status-update', briefUpdate);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Pusher broadcast error:', error);
        return NextResponse.json(
            { error: 'Failed to broadcast update' },
            { status: 500 }
        );
    }
}
