"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

const SIDEBAR_PATHS = [ // Whitelist of paths that SHOULD have the sidebar
    "/dashboard",
    "/research",
    "/my-requests",
    "/settings",
    "/invite-users",
    "/analytics",
    "/features",
    "/ai-rewriter",
    "/content-briefs"
]

export function ClientGlobalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user, isHealthy } = useAuth();
    const { userRole, loading, isResolved } = useUserRole(user?.id);

    // Only show sidebar if the path starts with one of the whitelisted paths AND is not login
    const showSidebar = pathname && !pathname.includes('/login') ? SIDEBAR_PATHS.some((path) => pathname.startsWith(path)) : false;

    if (!showSidebar) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar userRole={userRole} loading={loading} />
            <main className="flex-1 ml-64 relative">
                {!isHealthy && (
                    <div className="absolute top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg backdrop-blur-sm flex items-center justify-between shadow-lg">
                            <span className="text-sm font-medium flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                                </span>
                                Connection lost. Data may not be current.
                            </span>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-xs underline font-semibold hover:opacity-80 transition-opacity"
                            >
                                Refresh Now
                            </button>
                        </div>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
