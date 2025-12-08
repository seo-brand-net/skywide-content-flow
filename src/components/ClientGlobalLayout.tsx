"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

const NO_SIDEBAR_PATHS = ["/login", "/register", "/reset-password", "/"];

export function ClientGlobalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { userRole, loading } = useUserRole(user?.id);

    const isNoSidebar = NO_SIDEBAR_PATHS.some((path) =>
        path === "/" ? pathname === "/" : pathname?.startsWith(path)
    );

    if (isNoSidebar) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar userRole={userRole} loading={loading} />
            <main className="flex-1 ml-64">{children}</main>
        </div>
    );
}
