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

        const response = await fetch(googleAppsScriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            redirect: 'follow'
        });

        console.log('Apps Script Response Status:', response.status);

        const data = await response.text();
        let json;
        try {
            json = JSON.parse(data);
        } catch {
            json = { message: data };
        }

        if (!response.ok) {
            console.error(`Apps Script Error (${response.status}):`, data);
            return NextResponse.json({
                error: 'Apps Script returned an error',
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
