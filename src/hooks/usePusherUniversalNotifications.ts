import { useEffect } from 'react';
import { getPusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';

interface BriefStatusUpdate {
    id: string;
    client_id: string;
    primary_keyword: string;
    status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'ERROR';
    brief_url?: string;
    notes?: string;
}

export function usePusherUniversalNotifications() {
    const { toast } = useToast();

    useEffect(() => {
        console.log('[Pusher Universal] 🛰️ Listening for notifications');
        const pusher = getPusherClient();

        // Monitor connection specifically for notifications
        const stateHandler = (states: { current: string }) => {
            console.log(`[Pusher Universal] 💓 Connection state: ${states.current}`);
        };
        pusher.connection.bind('state_change', stateHandler);

        // Subscribe to global activity channel
        const channelName = 'content-briefs-activity';
        const channel = pusher.subscribe(channelName);

        // Listen for brief status updates
        const updateHandler = (data: BriefStatusUpdate) => {
            console.log('[Pusher Universal] 🔔 Notification event received:', data.status, data.primary_keyword);
            if (data.status === 'DONE') {
                toast({
                    title: "✨ Content Brief Ready!",
                    description: `The brief for "${data.primary_keyword}" has been generated successfully.`,
                });
            } else if (data.status === 'ERROR') {
                toast({
                    title: "❌ Research Failed",
                    description: `An error occurred while generating the brief for "${data.primary_keyword}".`,
                    variant: "destructive",
                });
            }
        };

        channel.bind('brief-status-update', updateHandler);

        return () => {
            console.log('[Pusher Universal] 🧹 Cleaning up notification handlers');
            pusher.connection.unbind('state_change', stateHandler);
            channel.unbind('brief-status-update', updateHandler);
            pusher.unsubscribe(channelName);
        };
    }, [toast]);
}
