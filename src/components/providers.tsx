"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";

import { User, Session } from "@supabase/supabase-js";

export function Providers({
    children,
    initialUser = null,
    initialSession = null,
    initialProfile = null
}: {
    children: React.ReactNode,
    initialUser?: User | null,
    initialSession?: Session | null,
    initialProfile?: any | null
}) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <TooltipProvider>
                    <AuthProvider
                        initialUser={initialUser}
                        initialSession={initialSession}
                        initialProfile={initialProfile}
                    >
                        {children}
                        <Toaster />
                        <Sonner />
                    </AuthProvider>
                </TooltipProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
