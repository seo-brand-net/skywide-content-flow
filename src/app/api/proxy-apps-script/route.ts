import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Proxying request to Apps Script...', { folderId: body.folderId });

        // This URL should be the Web App URL Mike gets after deploying
        const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

        if (!googleAppsScriptUrl) {
            console.error('Proxy Error: GOOGLE_APPS_SCRIPT_URL is missing in environment variables');
            return NextResponse.json({ error: 'Google Apps Script URL not configured in .env' }, { status: 500 });
        }

        console.log('Target GAS URL:', googleAppsScriptUrl.substring(0, 30) + '...');

        // Determine if we should wait for response or fire-and-forget
        // runBriefGeneration is long-running, so we fire-and-forget to avoid Vercel timeouts.
        const isAsync = body.command === 'runBriefGeneration' || !body.command;

        if (isAsync) {
            console.log('Using Reliable Trigger (Awaited) for:', body.command || 'runBriefGeneration');
            const response = await fetch(googleAppsScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                redirect: 'follow'
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Apps Script rejected the trigger: ${errorData}`);
            }

            const data = await response.text();
            let json;
            try {
                json = JSON.parse(data);
            } catch {
                json = { status: 'error', message: data };
            }

            // If GAS returned a specific result status (like error for no rows), relay it.
            // Our doPost returns { status: "success", result: { status: "triggered", ... } }
            if (json.status === 'success' && json.result) {
                return NextResponse.json(json.result);
            }

            return NextResponse.json(json);
        }

        // For other commands (like getWorkbookData), we wait for the response
        const response = await fetch(googleAppsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            redirect: 'follow'
        });

        const data = await response.text();
        let json;
        try {
            json = JSON.parse(data);
        } catch {
            json = { message: data };
        }

        if (!response.ok) {
            return NextResponse.json({
                error: 'Apps Script error',
                status: response.status,
                details: json
            }, { status: response.status });
        }

        return NextResponse.json(json);
    } catch (error: any) {
        console.error('Apps Script Proxy Catch Block:', error);
        return NextResponse.json({
            error: 'Internal Server Error in Proxy',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
