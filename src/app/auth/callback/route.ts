import { NextResponse } from 'next/server'
// The client you created in Step 2
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        console.log('AUTH CALLBACK: Code received:', code.substring(0, 10) + '...');
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log('AUTH CALLBACK: Session exchanged successfully. Redirecting to:', next);
            // Priority: URL origin > x-forwarded-host > fallback
            let baseUrl = origin;
            const forwardedHost = request.headers.get('x-forwarded-host');
            const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

            if (forwardedHost && !origin.includes('localhost')) {
                baseUrl = `${forwardedProto}://${forwardedHost}`;
            }

            // Ensure next is just a path
            const redirectUrl = new URL(next, baseUrl);
            return NextResponse.redirect(redirectUrl.toString());
        } else {
            console.error('AUTH CALLBACK Error: Failed to exchange code for session:', error.message, error.status);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
