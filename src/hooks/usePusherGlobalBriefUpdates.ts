import { useEffect, useState } from 'react';
import { getPusherClient } from '@/lib/pusher/client';

interface BriefStatusUpdate {
    id: string;
    client_id: string;
    primary_keyword: string;
    status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'ERROR';
    brief_url?: string;
    notes?: string;
    user_id?: string;
    secondary_keyword?: string;
    longtail_keywords?: string;
}

export function usePusherGlobalBriefUpdates() {
    const [updates, setUpdates] = useState<BriefStatusUpdate[]>([]);

    useEffect(() => {
        console.log('[Pusher Global] 🛰️ Subscribing to global content brief updates channel');

        const pusher = getPusherClient();

        // Subscribe to global activity channel
        const channelName = 'content-briefs-activity';
        const channel = pusher.subscribe(channelName);

        // Listen for brief status updates
        const updateHandler = (data: BriefStatusUpdate) => {
            console.log('[Pusher Global] 📨 Activity update received:', data);
            setUpdates(prev => [...prev, data]);
        };

        channel.bind('brief-status-update', updateHandler);

        return () => {
            console.log('[Pusher Global] 🧹 Unsubscribing from global channel');
            channel.unbind('brief-status-update', updateHandler);
            pusher.unsubscribe(channelName);
            // DO NOT disconnect here, let the singleton persist
        };
    }, []);

    return updates;
}
