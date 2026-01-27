'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<string>('Processing authentication...');

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createClient();

            console.log('🔐 [PASSWORD RESET] Callback triggered');
            console.log('🔐 [PASSWORD RESET] URL:', window.location.href);

            // Extract hash tokens from URL
            const hashFragment = window.location.hash.substring(1);
            console.log('🔐 [PASSWORD RESET] Hash fragment:', hashFragment);

            if (!hashFragment) {
                console.error('❌ No hash fragment found');
                setStatus('Error: No authentication data');
                router.push('/login?error=no_auth_data');
                return;
            }

            const params = new URLSearchParams(hashFragment);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            console.log('🔐 [PASSWORD RESET] Tokens:', {
                hasAccess: !!accessToken,
                hasRefresh: !!refreshToken,
                type
            });

            if (!accessToken || !refreshToken) {
                console.error('❌ Missing tokens');
                setStatus('Error: Invalid authentication tokens');
                router.push('/login?error=invalid_tokens');
                return;
            }

            // Set the session
            console.log('🔐 [PASSWORD RESET] Setting session...');
            setStatus('Setting up your session...');

            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                console.error('❌ Session error:', error);
                setStatus(`Error: ${error.message}`);
                router.push(`/login?error=${encodeURIComponent(error.message)}`);
                return;
            }

            console.log('✅ Session set successfully:', data);

            // Route based on type
            if (type === 'recovery') {
                console.log('🔐 [PASSWORD RESET] → Redirecting to update-password');
                setStatus('Redirecting to password update...');
                router.push('/update-password');
            } else {
                console.log('✅ [AUTH] → Redirecting to dashboard');
                setStatus('Redirecting...');
                router.push('/dashboard');
            }
        };

        handleCallback();
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center max-w-md p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue-crayola mx-auto mb-4"></div>
                <p className="text-muted-foreground text-sm">{status}</p>
                <p className="text-xs text-muted-foreground mt-4 opacity-50">
                    Check console (F12) for detailed logs
                </p>
            </div>
        </div>
    );
}
