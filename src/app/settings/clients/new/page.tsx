"use client";

import { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientForm } from '@/components/clients/ClientForm';

function NewClientPageInner() {
    const { isInitialLoading } = useAuth();
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
