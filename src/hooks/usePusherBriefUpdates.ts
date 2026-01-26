import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

interface BriefStatusUpdate {
    id: string;
    client_id: string;
    primary_keyword: string;
    status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'ERROR';
    brief_url?: string;
    notes?: string;
}

export function usePusherBriefUpdates(clientId: string | null) {
    const [updates, setUpdates] = useState<BriefStatusUpdate[]>([]);

    useEffect(() => {
        if (!clientId) {
            console.log('[Pusher] No clientId, skipping subscription');
            return;
        }

        console.log('[Pusher] Initializing for client:', clientId);
        console.log('[Pusher] Key:', process.env.NEXT_PUBLIC_PUSHER_KEY);
        console.log('[Pusher] Cluster:', process.env.NEXT_PUBLIC_PUSHER_CLUSTER);

        // Initialize Pusher with debug enabled
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        // Log connection state
        pusher.connection.bind('state_change', (states: any) => {
            console.log('[Pusher] State changed:', states.previous, '→', states.current);
        });

        pusher.connection.bind('connected', () => {
            console.log('[Pusher] ✅ Connected to Pusher');
        });

        pusher.connection.bind('error', (err: any) => {
            console.error('[Pusher] ❌ Connection error:', err);
        });

        // Subscribe to client-specific channel
        const channelName = `client-${clientId}`;
        console.log('[Pusher] Subscribing to channel:', channelName);
        const channel = pusher.subscribe(channelName);

        channel.bind('pusher:subscription_succeeded', () => {
            console.log('[Pusher] ✅ Subscribed to', channelName);
        });

        channel.bind('pusher:subscription_error', (err: any) => {
            console.error('[Pusher] ❌ Subscription error for', channelName, err);
        });

        // Listen for brief status updates
        channel.bind('brief-status-update', (data: BriefStatusUpdate) => {
            console.log('[Pusher] 📨 Event received:', data);
            setUpdates(prev => [...prev, data]);
        });

        return () => {
            console.log('[Pusher] Cleaning up subscription for', channelName);
            channel.unbind_all();
            channel.unsubscribe();
            pusher.disconnect();
        };
    }, [clientId]);

    return updates;
}
