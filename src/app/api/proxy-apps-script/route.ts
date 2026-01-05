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

        // FIRE AND FORGET: 
        // We don't await the full execution to avoid Vercel timeouts.
        // Google Apps Script will process the request and call our callback endpoint when finished.
        fetch(googleAppsScriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            redirect: 'follow'
        }).catch(err => console.error('Background GAS trigger error:', err));

        return NextResponse.json({
            status: 'triggered',
            message: 'Automation initiated. The dashboard will update automatically when results are ready.'
        });
    } catch (error: any) {
        console.error('Apps Script Proxy Catch Block:', error);
        return NextResponse.json({
            error: 'Internal Server Error in Proxy',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
