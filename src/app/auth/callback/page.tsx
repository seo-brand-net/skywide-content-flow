'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const [debugInfo, setDebugInfo] = useState<string>('');

    useEffect(() => {
        const handleCallback = async () => {
            console.log('🔍 [AUTH CALLBACK] Starting...');
            console.log('🔍 [AUTH CALLBACK] Full URL:', window.location.href);

            // Let Supabase automatically handle the authentication
            // This works for both hash tokens AND PKCE codes
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ [AUTH CALLBACK] Error:', error);
                setDebugInfo(`Error: ${error.message}`);
                router.push(`/login?error=${error.message}`);
                return;
            }

            if (session) {
                console.log('✅ [AUTH CALLBACK] Session found');

                // Check where to redirect
                const next = searchParams.get('next');

                if (next?.includes('update-password')) {
                    console.log('🔐 [AUTH CALLBACK] Redirecting to update-password');
                    router.push('/update-password');
                } else {
                    console.log('✅ [AUTH CALLBACK] Redirecting to', next || '/dashboard');
                    router.push(next || '/dashboard');
                }
                return;
            }

            console.error('❌ [AUTH CALLBACK] No session found');
            setDebugInfo('No session');
            router.push('/login?error=no_session');
        };

        handleCallback();
    }, [router, supabase, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center max-w-md p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue-crayola mx-auto mb-4"></div>
                <p className="text-muted-foreground mb-2">Processing authentication...</p>
                {debugInfo && (
                    <p className="text-xs text-muted-foreground mt-4 font-mono bg-muted p-2 rounded">
                        {debugInfo}
                    </p>
                )}
            </div>
        </div>
    );
}
