"use client";

import { Home, FileText, BarChart, Settings, LogOut, Users, MessageSquare, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'My Requests', path: '/my-requests' },
    { icon: Sparkles, label: 'AI Rewriter', path: '/ai-rewriter' },
    { icon: MessageSquare, label: 'Features', path: '/features' },
    { icon: Search, label: 'Research', path: '/research' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

const adminNavItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'My Requests', path: '/my-requests' },
    { icon: Sparkles, label: 'AI Rewriter', path: '/ai-rewriter' },
    { icon: MessageSquare, label: 'Features', path: '/features' },
    { icon: Search, label: 'Research', path: '/research' },
    { icon: Users, label: 'Invite Users', path: '/invite-users' },
    { icon: BarChart, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
    userRole: string;
    loading: boolean;
}

export function Sidebar({ userRole, loading }: SidebarProps) {
    const { signOut } = useAuth();
    const pathname = usePathname();

    const isActive = (path: string) => {
        return pathname === path || (path === '/dashboard' && pathname === '/');
    };

    // Show loading skeleton while role is being checked
    if (loading) {
        return (
            <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-sidebar-border">
                    <div className="h-8 w-32 bg-sidebar-accent/30 rounded animate-pulse"></div>
                </div>

                {/* Loading Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <li key={i}>
                                <div className="flex items-center gap-3 px-3 py-2 rounded-md">
                                    <div className="h-5 w-5 bg-sidebar-accent/30 rounded animate-pulse"></div>
                                    <div className="h-4 bg-sidebar-accent/30 rounded animate-pulse flex-1"></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer with Sign Out */}
                <div className="p-4 border-t border-sidebar-border">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md">
                        <div className="h-4 w-4 bg-sidebar-accent/30 rounded animate-pulse"></div>
                        <div className="h-4 bg-sidebar-accent/30 rounded animate-pulse flex-1"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Use admin nav items if user is admin, otherwise regular nav items
    const currentNavItems = userRole === 'admin' ? adminNavItems : navItems;

    return (
        <div style={{ zIndex: 99 }} className="z-99 fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-sidebar-border">
                <Logo />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {currentNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <li key={item.path}>
                                <Link
                                    href={item.path}
                                    className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${active
                                            ? 'bg-sidebar-accent text-sidebar-primary'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                                        }
                  `}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* SEObrand Logo */}
            <div className="p-4 flex flex-col items-center">
                {/* Updated Image for Next.js - assuming file is in public/lovable-uploads */}
                <img
                    src="/lovable-uploads/ae19eee1-57bc-4b76-865e-f89a663021a9.png"
                    alt="SEObrand"
                    className="h-12 opacity-60 hover:opacity-80 transition-opacity"
                />
                <p className="text-xs text-sidebar-foreground/60 mt-2 text-center">
                    For SEO Brand Staff Members Only
                </p>
            </div>

            {/* Footer with Sign Out */}
            <div className="p-4 border-t border-sidebar-border">
                <Button
                    onClick={signOut}
                    variant="ghost"
                    className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
