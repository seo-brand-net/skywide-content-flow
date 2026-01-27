import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    const origin = requestUrl.origin;

    console.log('[AUTH CALLBACK] Request received:', {
        code: code?.substring(0, 10) + '...',
        next,
        origin
    });

    if (code) {
        const supabase = await createClient();

        console.log('[AUTH CALLBACK] Exchanging code for session...');

        // CRITICAL: Server-side code exchange - no PKCE issues!
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.session) {
            console.log('[AUTH CALLBACK] ✅ Session created for:', data.user.email);

            // Session is now in cookies, redirect to destination
            const redirectUrl = `${origin}${next}`;
            console.log('[AUTH CALLBACK] Redirecting to:', redirectUrl);

            return NextResponse.redirect(redirectUrl);
        } else {
            console.error('[AUTH CALLBACK] ❌ Code exchange failed:', error);
            return NextResponse.redirect(
                `${origin}/auth/error?error=${encodeURIComponent(error?.message || 'Unknown error')}`
            );
        }
    }

    // Check for error params from Supabase
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    if (error) {
        console.error('[AUTH CALLBACK] ❌ Error in URL:', error, errorDescription);
        return NextResponse.redirect(
            `${origin}/auth/error?error=${encodeURIComponent(errorDescription || error)}`
        );
    }

    // No code, no error - invalid callback
    console.error('[AUTH CALLBACK] ❌ No code or error in URL');
    return NextResponse.redirect(`${origin}/login?error=invalid_callback`);
}
