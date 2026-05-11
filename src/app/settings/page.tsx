"use client";

import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

export default function Settings() {
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
                    <p className="text-muted-foreground">Platform configuration and management.</p>
                </div>

                <div className="grid gap-4 max-w-xl">
                    <Link
                        href="/settings/clients"
                        className="flex items-center justify-between p-5 bg-card border border-border/50 rounded-xl hover:border-brand-blue-crayola/40 hover:bg-muted/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl group-hover:bg-brand-blue-crayola/20 transition-colors">
                                <Users className="w-5 h-5 text-brand-blue-crayola" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">Client Management</p>
                                <p className="text-sm text-muted-foreground">
                                    Manage all clients, service toggles, and locations in one place.
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand-blue-crayola transition-colors" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
