"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, ReactNode } from 'react';
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

    useEffect(() => {
        // Only redirect if not loading, no user, and not on a public path
        const isPublicPath =
            pathname === '/login' ||
            pathname === '/register' ||
            pathname.startsWith('/auth') ||
            pathname === '/reset-password' ||
            pathname === '/update-password' ||
            pathname === '/';

        if (!loading && !user && !isPublicPath && !isPasswordReset) {
            if (toastShownForPath.current !== pathname) {
                toast({
                    title: "Authentication Required",
                    description: "Please sign in to access this page.",
                    variant: "destructive",
                });
                toastShownForPath.current = pathname;
            }
            router.replace('/login');
        }
    }, [loading, user, pathname, router, toast, isPasswordReset]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
            </div>
        );
    }

    // Allow access to public entry points (reset-password and update-password)
    const isPublicPath =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname.startsWith('/auth') ||
        pathname === '/reset-password' ||
        pathname === '/update-password' ||
        pathname === '/';

    // If it's a public path or we have a user (or in reset flow), render children
    if (user || isPublicPath || isPasswordReset) {
        return <>{children}</>;
    }

    // Otherwise, return null while redirecting
    return null;
}
