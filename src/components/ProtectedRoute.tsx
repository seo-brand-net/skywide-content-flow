"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading, isPasswordReset } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const toastShownForPath = useRef<string | null>(null);

    // Show toast when redirecting unauthenticated users or when session is expired/invalid
    useEffect(() => {
        // Reset toast flag when user becomes authenticated
        if (user) {
            toastShownForPath.current = null;
            return;
        }

        // Show toast if:
        // - Not loading
        // - User is not authenticated (either no user or expired/invalid session)
        // - Not in password reset flow
        // - Not already on login page
        // - Haven't shown toast for this path yet
        if (
            !loading &&
            !user &&
            !isPasswordReset &&
            pathname !== '/login' &&
            toastShownForPath.current !== pathname
        ) {
            toastShownForPath.current = pathname;
            toast({
                description: "Please log in to continue.",
            });
            router.replace('/login');
        }
    }, [loading, user, isPasswordReset, pathname, toast, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Allow access to reset password page during password reset flow
    if (isPasswordReset && pathname === '/reset-password') {
        return <>{children}</>;
    }

    // Prevent access to other protected routes during password reset
    if (isPasswordReset && pathname !== '/reset-password') {
        // We can't return Navigate component, so we return null and let useEffect handle redirect
        // or manually redirect here if Next.js allows. 
        // Effect above handles the main login redirect, let's add specific logic here:
        if (typeof window !== 'undefined') router.replace('/reset-password');
        return null;
    }

    // Redirect unauthenticated users to login
    if (!user) {
        // Handled by useEffect, return null while redirecting
        return null;
    }

    return <>{children}</>;
}
