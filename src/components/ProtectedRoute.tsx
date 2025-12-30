"use client";

import { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    // TEMPORARY: Access control disabled for debugging password reset flow
    return <>{children}</>;
}
