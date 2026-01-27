'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();
    const supabase = createClient();
    const [debugInfo, setDebugInfo] = useState<string>('');

    useEffect(() => {
        const handleCallback = async () => {
            console.log('🔍 [AUTH CALLBACK] Starting...');
            console.log('🔍 [AUTH CALLBACK] Full URL:', window.location.href);
            console.log('🔍 [AUTH CALLBACK] Hash:', window.location.hash);
            console.log('🔍 [AUTH CALLBACK] Search:', window.location.search);

            // Method 1: Try hash-based tokens (password recovery, email confirmation)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            console.log('🔍 [AUTH CALLBACK] Extracted from hash:', {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                type,
                accessTokenPreview: accessToken?.substring(0, 20) + '...'
            });

            setDebugInfo(`Type: ${type || 'none'}, Has tokens: ${!!accessToken}`);

            if (accessToken && refreshToken) {
                console.log('✅ [AUTH CALLBACK] Found hash tokens, setting session...');

                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error('❌ [AUTH CALLBACK] Session set error:', error);
                    setDebugInfo(`Session error: ${error.message}`);
                    router.push(`/login?error=session_failed&details=${encodeURIComponent(error.message)}`);
                    return;
                }

                console.log('✅ [AUTH CALLBACK] Session set successfully:', data);

                // Handle different auth types
                if (type === 'recovery') {
                    console.log('🔐 [AUTH CALLBACK] Recovery flow detected, redirecting to update-password');
                    router.push('/update-password');
                    return;
                } else if (type === 'signup' || type === 'invite') {
                    console.log('👤 [AUTH CALLBACK] Signup/invite flow detected, redirecting to dashboard');
                    router.push('/dashboard');
                    return;
                } else {
                    // Default redirect for successful auth with unknown type
                    console.log('✅ [AUTH CALLBACK] Unknown type, defaulting to dashboard');
                    router.push('/dashboard');
                    return;
                }
            }

            // Method 2: Try code-based exchange (OAuth providers)
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const next = urlParams.get('next') || '/dashboard';

            console.log('🔍 [AUTH CALLBACK] Checking for code exchange:', {
                hasCode: !!code,
                next
            });

            if (code) {
                console.log('🔄 [AUTH CALLBACK] Code found, exchanging...');
                const { error } = await supabase.auth.exchangeCodeForSession(code);

                if (!error) {
                    console.log('✅ [AUTH CALLBACK] Code exchange successful');
                    router.push(next);
                    return;
                } else {
                    console.error('❌ [AUTH CALLBACK] Code exchange error:', error);
                    setDebugInfo(`Code exchange error: ${error.message}`);
                }
            }

            // If we get here, no valid auth method found
            console.error('❌ [AUTH CALLBACK] No valid authentication method found');
            console.log('🔍 [AUTH CALLBACK] Debug info:', {
                hasHash: !!window.location.hash,
                hashLength: window.location.hash.length,
                hasSearch: !!window.location.search,
                searchLength: window.location.search.length
            });

            setDebugInfo('No auth tokens found');
            router.push('/login?error=auth_callback_failed&details=no_tokens_found');
        };

        handleCallback();
    }, [router, supabase]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center max-w-md p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue-crayola mx-auto mb-4"></div>
                <p className="text-muted-foreground mb-2">Processing authentication...</p>
                {debugInfo && (
                    <p className="text-xs text-muted-foreground mt-4 font-mono bg-muted p-2 rounded">
                        Debug: {debugInfo}
                    </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                    Check browser console (F12) for detailed logs
                </p>
            </div>
        </div>
    );
}
