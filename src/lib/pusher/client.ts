import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherInstance) {
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!key || !cluster) {
            console.error('[Pusher] ❌ Missing Pusher configuration (key or cluster)');
        }

        console.log('[Pusher] 🔌 Initializing shared Pusher client instance');
        pusherInstance = new PusherClient(key || '', {
            cluster: cluster || 'mt1',
            forceTLS: true
        });

        // Global connection monitoring
        pusherInstance.connection.bind('state_change', (states: { previous: string, current: string }) => {
            console.log(`[Pusher] 🔄 Connection state changed: ${states.previous} → ${states.current}`);
        });

        pusherInstance.connection.bind('error', (err: any) => {
            console.error('[Pusher] ❌ Connection error:', err);
        });
    }

    return pusherInstance;
}

export function subscribeToRun(runId: string, callbacks: {
    onUpdate?: (data: any) => void;
    onStageUpdate?: (data: any) => void;
}) {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`run-${runId}`);

    if (callbacks.onUpdate) {
        channel.bind('update', callbacks.onUpdate);
    }

    if (callbacks.onStageUpdate) {
        channel.bind('stage-update', callbacks.onStageUpdate);
    }

    return () => {
        channel.unbind_all();
        pusher.unsubscribe(`run-${runId}`);
    };
}
