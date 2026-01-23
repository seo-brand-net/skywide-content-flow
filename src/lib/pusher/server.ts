import Pusher from 'pusher';

// Singleton Pusher server instance
let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
    if (!pusherInstance) {
        pusherInstance = new Pusher({
            appId: process.env.PUSHER_APP_ID || '',
            key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
            secret: process.env.PUSHER_SECRET || '',
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
            useTLS: true,
        });
    }

    return pusherInstance;
}

export async function triggerRunUpdate(runId: string, data: any) {
    const pusher = getPusherServer();

    await pusher.trigger(`run-${runId}`, 'update', data);
}

export async function triggerStageUpdate(runId: string, stageData: any) {
    const pusher = getPusherServer();

    await pusher.trigger(`run-${runId}`, 'stage-update', stageData);
}
