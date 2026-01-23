import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherInstance) {
        pusherInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
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
