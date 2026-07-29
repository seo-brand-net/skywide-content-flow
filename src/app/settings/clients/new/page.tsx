"use client";

import { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import { ClientForm } from '@/components/clients/ClientForm';

function NewClientPageInner() {
    const { user } = useAuth();
    const { userRole, isInitialLoading } = useUserRole(user?.id);
    const searchParams = useSearchParams();
    const service = searchParams.get('service') as 'content' | 'gbp' | 'indexing' | null;
    const returnTo = searchParams.get('returnTo');

    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </div>
        );
    }

    if (userRole !== 'admin') {
        return (
            <div className="min-h-screen bg-background p-8 flex items-center justify-center">
                <div className="text-center space-y-3 opacity-60">
                    <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">Admin access required</p>
                    <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return <ClientForm defaultService={service || undefined} returnTo={returnTo || undefined} />;
}

export default function NewClientPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </div>
        }>
            <NewClientPageInner />
        </Suspense>
    );
}
