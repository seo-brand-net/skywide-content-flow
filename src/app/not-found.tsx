"use client";

import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    // We can't use useLocation from react-router in Next.js, and usePathname might be available but
    // standard behavior for not-found.tsx in Next.js is sufficient.
    // We'll mimic the UI.

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
                <Button asChild>
                    <Link href="/dashboard">
                        Return to Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
