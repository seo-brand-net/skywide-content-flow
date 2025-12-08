"use client";

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const { user } = useAuth();
    const { userRole, loading } = useUserRole(user?.id);

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar userRole={userRole} loading={loading} />
            <main className="flex-1 ml-64">
                {children}
            </main>
        </div>
    );
}
