"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePusherUniversalNotifications } from "@/hooks/usePusherUniversalNotifications";

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
];

export function ClientGlobalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { userRole, loading, isResolved } = useUserRole(user?.id);

    // Initialize universal notifications for content briefs
    usePusherUniversalNotifications();

    // Only show sidebar if the path starts with one of the whitelisted paths AND is not login
    const showSidebar = pathname && !pathname.includes('/login') ? SIDEBAR_PATHS.some((path) => pathname.startsWith(path)) : false;

    if (!showSidebar) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar userRole={userRole} loading={loading} />
            <main className="flex-1 ml-64">{children}</main>
        </div>
    );
}
