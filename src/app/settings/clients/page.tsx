"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users,
    Search,
    RefreshCw,
    Loader2,
    FileText,
    Globe,
    MapPin,
    ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AddClientModal } from '@/components/clients/AddClientModal';
import { LocationsPanel } from '@/components/clients/LocationsPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
    id: string;
    name: string;
    industry: string | null;
    sitemap_url: string | null;
    key_selling_point: string | null;
    workbook_url: string | null;
    folder_url: string | null;
    content_enabled: boolean;
    gbp_enabled: boolean;
    indexing_enabled: boolean;
    created_at: string;
}

// ─── Service badge config ─────────────────────────────────────────────────────

const SERVICE_CONFIGS = [
    {
        key: 'content_enabled' as keyof Client,
        label: 'Content',
        icon: FileText,
        activeClass: 'bg-brand-blue-crayola/10 text-brand-blue-crayola border-brand-blue-crayola/25',
        inactiveClass: 'bg-muted/20 text-muted-foreground border-border/30',
    },
    {
        key: 'gbp_enabled' as keyof Client,
        label: 'GBP',
        icon: MapPin,
        activeClass: 'bg-green-500/10 text-green-500 border-green-500/25',
        inactiveClass: 'bg-muted/20 text-muted-foreground border-border/30',
    },
    {
        key: 'indexing_enabled' as keyof Client,
        label: 'Indexing',
        icon: Globe,
        activeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/25',
        inactiveClass: 'bg-muted/20 text-muted-foreground border-border/30',
    },
];

// ─── Service Toggle ───────────────────────────────────────────────────────────

function ServiceToggle({
    client,
    serviceKey,
    label,
    activeClass,
    inactiveClass,
    onToggle,
}: {
    client: Client;
    serviceKey: keyof Client;
    label: string;
    activeClass: string;
    inactiveClass: string;
    onToggle: (id: string, key: keyof Client, value: boolean) => void;
}) {
    const isActive = client[serviceKey] as boolean;
    return (
        <div className="flex items-center gap-2">
            <Switch
                id={`${client.id}-${serviceKey}`}
                checked={isActive}
                onCheckedChange={(checked) => onToggle(client.id, serviceKey, checked)}
                className="scale-[0.8]"
            />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isActive ? activeClass : inactiveClass}`}>
                {label}
            </span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsSettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { userRole, isInitialLoading } = useUserRole(user?.id);

    const [searchTerm, setSearchTerm] = useState('');

    // ── Data ──────────────────────────────────────────────────────────────────

    const { data: clients = [], isLoading, refetch } = useQuery({
        queryKey: ['clients_unified'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, industry, sitemap_url, key_selling_point, workbook_url, folder_url, content_enabled, gbp_enabled, indexing_enabled, created_at')
                .order('name');
            if (error) throw error;
            return data as Client[];
        },
        enabled: !!user?.id,
    });

    // ── Derived ───────────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return clients;
        const q = searchTerm.toLowerCase();
        return clients.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            (c.industry ?? '').toLowerCase().includes(q)
        );
    }, [clients, searchTerm]);

    const gbpCount = clients.filter((c) => c.gbp_enabled).length;
    const contentCount = clients.filter((c) => c.content_enabled).length;
    const indexingCount = clients.filter((c) => c.indexing_enabled).length;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggle = async (id: string, key: keyof Client, value: boolean) => {
        // Optimistic update
        queryClient.setQueryData<Client[]>(['clients_unified'], (old) =>
            (old ?? []).map((c) => (c.id === id ? { ...c, [key]: value } : c))
        );
        const { error } = await supabase
            .from('clients')
            .update({ [key]: value })
            .eq('id', id);
        if (error) {
            // Revert
            queryClient.setQueryData<Client[]>(['clients_unified'], (old) =>
                (old ?? []).map((c) => (c.id === id ? { ...c, [key]: !value } : c))
            );
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    // ── Auth guard ────────────────────────────────────────────────────────────

    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[400px] w-full" />
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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto">

                {/* ── Header ────────────────────────────────────────────── */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                                <Users className="w-6 h-6 text-brand-blue-crayola" />
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
                        </div>
                        <p className="text-muted-foreground">
                            {clients.length} {clients.length === 1 ? 'client' : 'clients'} — manage services and locations in one place.
                        </p>
                    </div>
                    <AddClientModal onClientAdded={() => refetch()} />
                </div>

                {/* ── Stats Row ─────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Content Briefs', count: contentCount, icon: FileText, color: 'text-brand-blue-crayola', bg: 'bg-brand-blue-crayola/10' },
                        { label: 'GBP Posts', count: gbpCount, icon: MapPin, color: 'text-green-500', bg: 'bg-green-500/10' },
                        { label: 'Indexing', count: indexingCount, icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map(({ label, count, icon: Icon, color, bg }) => (
                        <div key={label} className="bg-card border border-border/50 rounded-xl p-5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${bg} rounded-lg`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{count}</p>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Table Card ────────────────────────────────────────── */}
                <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search clients..."
                                    className="pl-10 bg-background/50 border-border/50 h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 gap-2 font-bold"
                                onClick={() => refetch()}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-brand-blue-crayola/50" />
                                <p className="text-muted-foreground font-medium">Loading clients...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-50">
                                <Users className="w-10 h-10" />
                                <p className="text-lg font-bold">
                                    {clients.length === 0 ? 'No clients yet' : 'No results found'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {clients.length === 0
                                        ? 'Click "Add Client" to get started.'
                                        : 'Try adjusting your search.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-muted/20 border-b border-border/50">
                                            <th className="px-6 py-4 font-bold text-foreground">Client</th>
                                            <th className="px-4 py-4 font-bold text-foreground">Industry</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-center">Content</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-center">GBP</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-center">Indexing</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filtered.map((client) => (
                                            <tr key={client.id} className="hover:bg-muted/20 transition-colors group align-top">

                                                {/* Client name + locations */}
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-foreground group-hover:text-brand-blue-crayola transition-colors">
                                                        {client.name}
                                                    </p>
                                                    {client.sitemap_url && (
                                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[220px]">
                                                            {client.sitemap_url}
                                                        </p>
                                                    )}
                                                    <LocationsPanel client={client} />
                                                </td>

                                                {/* Industry */}
                                                <td className="px-4 py-4">
                                                    <span className="text-xs text-muted-foreground">
                                                        {client.industry ?? '—'}
                                                    </span>
                                                </td>

                                                {/* Service toggles */}
                                                {SERVICE_CONFIGS.map(({ key, label, activeClass, inactiveClass }) => (
                                                    <td key={key} className="px-4 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <ServiceToggle
                                                                client={client}
                                                                serviceKey={key}
                                                                label={label}
                                                                activeClass={activeClass}
                                                                inactiveClass={inactiveClass}
                                                                onToggle={handleToggle}
                                                            />
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
