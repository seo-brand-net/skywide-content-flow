'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [debugInfo, setDebugInfo] = useState<string>('Processing...');

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createClient();

            console.log('[AUTH] Full URL:', window.location.href);

            // IMPORTANT: Check if we have hash-based tokens first
            const hashFragment = window.location.hash.substring(1);
            const hashParams = new URLSearchParams(hashFragment);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            console.log('[AUTH] Hash tokens:', {
                hasAccess: !!accessToken,
                hasRefresh: !!refreshToken,
                type
            });

            // If we have hash tokens, manually set the session
            if (accessToken && refreshToken) {
                console.log('[AUTH] Setting session from hash tokens...');
                setDebugInfo('Setting up session...');

                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error('[AUTH] Session error:', error);
                    setDebugInfo(`Error: ${error.message}`);
                    router.push(`/login?error=${encodeURIComponent(error.message)}`);
                    return;
                }

                console.log('[AUTH] Session set successfully');

                // Redirect based on type
                if (type === 'recovery') {
                    console.log('[AUTH] Password recovery → /update-password');
                    router.push('/update-password');
                    return;
                }

                const next = searchParams.get('next') || '/dashboard';
                console.log('[AUTH] Success → ', next);
                router.push(next);
                return;
            }

            // No hash tokens - wait a moment for Supabase to auto-process, then check session
            console.log('[AUTH] No hash tokens, checking session...');
            setDebugInfo('Checking session...');

            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('[AUTH] Session error:', error);
                setDebugInfo(`Error: ${error.message}`);
                router.push(`/login?error=${encodeURIComponent(error.message)}`);
                return;
            }

            if (session) {
                console.log('[AUTH] Found existing session');
                const next = searchParams.get('next') || '/dashboard';
                console.log('[AUTH] Redirecting to:', next);
                router.push(next);
                return;
            }

            // No session found
            console.warn('[AUTH] No session found');
            setDebugInfo('No authentication found');
            router.push('/login?error=no_session');
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center max-w-md p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue-crayola mx-auto mb-4"></div>
                <p className="text-muted-foreground mb-2">Processing authentication...</p>
                <p className="text-xs text-muted-foreground mt-4 font-mono bg-muted p-2 rounded">
                    {debugInfo}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                    Check console (F12) for logs
                </p>
            </div>
        </div>
    );
}
