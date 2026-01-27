import { NextResponse } from 'next/server'
// The client you created in Step 2
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
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
            console.error('Auth callback exchange error:', error);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
