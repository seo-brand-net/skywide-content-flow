'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const handleCallback = async () => {
            // Check for hash-based tokens (password recovery, email confirmation)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            if (accessToken && refreshToken) {
                // Set the session from the tokens
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (!error) {
                    // Handle different auth types
                    if (type === 'recovery') {
                        // Password recovery flow
                        router.push('/update-password');
                        return;
                    } else if (type === 'signup' || type === 'invite') {
                        // Email confirmation or invite
                        router.push('/dashboard');
                        return;
                    }
                } else {
                    console.error('Session set error:', error);
                    router.push('/login?error=session_failed');
                    return;
                }
            }

            // Check for code-based exchange (used by some OAuth providers)
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const next = urlParams.get('next') || '/dashboard';

            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);

                if (!error) {
                    router.push(next);
                    return;
                } else {
                    console.error('Code exchange error:', error);
                }
            }

            // If we get here, something went wrong
            router.push('/login?error=auth_callback_failed');
        };

        handleCallback();
    }, [router, supabase]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue-crayola mx-auto mb-4"></div>
                <p className="text-muted-foreground">Processing authentication...</p>
            </div>
        </div>
    );
}
