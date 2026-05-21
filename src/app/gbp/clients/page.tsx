"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Search, Building2, Globe, MapPin, Loader2, ArrowLeft,
    ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Plus, Trash2,
    Sheet
} from 'lucide-react';
import { AddGbpClientModal } from '@/components/gbp/AddGbpClientModal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// ─── Add Location Inline Form ─────────────────────────────────────────────────
function AddLocationForm({ clientId, onAdded }: { clientId: string; onAdded: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState({ location_name: '', city: '', state: '', sheet_tab_name: '' });
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!form.location_name.trim() || !form.city.trim() || !form.state.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('gbp_locations').insert([{
            gbp_client_id: clientId,
            ...form,
            sheet_tab_name: form.sheet_tab_name || null,
            is_active: true,
        }]);
        setSaving(false);
        if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
        setForm({ location_name: '', city: '', state: '', sheet_tab_name: '' });
        onAdded();
    };

    return (
        <div className="flex items-end gap-2 mt-3 p-3 bg-background/70 rounded-xl border border-brand-blue-crayola/20">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Location Name *</p>
                <Input value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="Tampa" className="h-8 text-xs bg-muted/30" />
            </div>
            <div className="w-28">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">City *</p>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Tampa" className="h-8 text-xs bg-muted/30" />
            </div>
            <div className="w-16">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">State *</p>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="FL" className="h-8 text-xs bg-muted/30" />
            </div>
            <div className="w-28">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Sheet Tab</p>
                <Input value={form.sheet_tab_name} onChange={e => setForm({ ...form, sheet_tab_name: e.target.value })} placeholder="Tampa" className="h-8 text-xs bg-muted/30" />
            </div>
            <Button onClick={handleAdd} disabled={saving || !form.location_name.trim() || !form.city.trim() || !form.state.trim()}
                size="sm" className="h-8 bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 text-xs gap-1 shrink-0">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
            </Button>
        </div>
    );
}

// ─── Location Row ─────────────────────────────────────────────────────────────
function LocationRow({ loc, onDelete, onToggle }: { loc: any; onDelete: () => void; onToggle: () => void }) {
    return (
        <div className={`flex items-center gap-4 py-2.5 px-3 rounded-lg group ${loc.is_active ? 'hover:bg-muted/20' : 'opacity-50 hover:opacity-70'} transition-all`}>
            {/* Connector line visual */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-4 h-px bg-border" />
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${loc.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{loc.location_name}</p>
                    <span className="text-xs text-muted-foreground">{loc.city}, {loc.state}</span>
                </div>
                {loc.sheet_tab_name && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <Sheet className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground font-mono">{loc.sheet_tab_name}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onToggle} className={`p-1 rounded transition-colors ${loc.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-muted-foreground hover:bg-muted'}`} title={loc.is_active ? 'Pause' : 'Activate'}>
                    {loc.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete location">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ─── Client Row ───────────────────────────────────────────────────────────────
function ClientRow({ client, onRefresh }: { client: any; onRefresh: () => void }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(false);
    const [showAddLoc, setShowAddLoc] = useState(false);

    const { data: locations = [], isLoading: locsLoading, refetch: refetchLocs } = useQuery({
        queryKey: ['gbp_locations_client', client.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('gbp_locations')
                .select('*').eq('gbp_client_id', client.id).order('location_name');
            if (error) throw error;
            return data;
        },
        enabled: expanded,
    });

    const handleToggleClient = async () => {
        const { error } = await supabase.from('gbp_clients').update({ is_active: !client.is_active }).eq('id', client.id);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else onRefresh();
    };

    const handleToggleLoc = async (loc: any) => {
        const { error } = await supabase.from('gbp_locations').update({ is_active: !loc.is_active }).eq('id', loc.id);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else refetchLocs();
    };

    const handleDeleteLoc = async (locId: string) => {
        const { error } = await supabase.from('gbp_locations').delete().eq('id', locId);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else { refetchLocs(); onRefresh(); }
    };

    const activeLocs = (client.gbp_locations || []).filter((l: any) => l.is_active).length;
    const totalLocs = (client.gbp_locations || []).length;

    return (
        <div className="border-b border-border/30 last:border-0">
            {/* Client row */}
            <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                        <p className="font-semibold text-foreground">{client.name}</p>
                        {!client.is_active && (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Paused</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                        <span className="text-xs text-muted-foreground">{client.industry}</span>
                        {client.sheet_id && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Sheet className="w-3 h-3" />
                                <span className="font-mono">{client.sheet_id.slice(0, 12)}…</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Location count badge */}
                    <button onClick={() => setExpanded(!expanded)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${expanded ? 'bg-brand-blue-crayola text-white border-brand-blue-crayola' : 'bg-brand-blue-crayola/10 text-brand-blue-crayola border-brand-blue-crayola/20 hover:bg-brand-blue-crayola/20'}`}>
                        <MapPin className="w-3 h-3" />
                        {totalLocs} location{totalLocs !== 1 ? 's' : ''}
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button onClick={handleToggleClient}
                        className={`transition-colors ${client.is_active ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}>
                        {client.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Nested locations panel */}
            {expanded && (
                <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="ml-4 pl-4 border-l-2 border-brand-blue-crayola/20 space-y-0.5">
                        {locsLoading ? (
                            <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading locations...
                            </div>
                        ) : locations.length === 0 ? (
                            <div className="py-3 text-sm text-muted-foreground italic">No locations configured yet.</div>
                        ) : locations.map((loc: any) => (
                            <LocationRow
                                key={loc.id}
                                loc={loc}
                                onDelete={() => handleDeleteLoc(loc.id)}
                                onToggle={() => handleToggleLoc(loc)}
                            />
                        ))}

                        {/* Add location inline */}
                        {showAddLoc ? (
                            <AddLocationForm clientId={client.id} onAdded={() => { refetchLocs(); onRefresh(); setShowAddLoc(false); }} />
                        ) : (
                            <button onClick={() => setShowAddLoc(true)}
                                className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-brand-blue-crayola hover:text-brand-blue-crayola/80 transition-colors py-1 px-2 rounded-lg hover:bg-brand-blue-crayola/5">
                                <Plus className="w-3.5 h-3.5" /> Add Location
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Clients Page ─────────────────────────────────────────────────────────────
export default function GbpClientsPage() {
    const { user } = useAuth();
    const { userRole } = useUserRole(user?.id);
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');

    const { data: clients = [], isLoading, refetch } = useQuery({
        queryKey: ['gbp_clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gbp_clients')
                .select('*, gbp_locations(id, is_active)')
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const filtered = clients.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry?.toLowerCase().includes(search.toLowerCase())
    );

    if (userRole !== 'admin') return <div className="p-8 text-center text-muted-foreground">Unauthorized</div>;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-2" onClick={() => router.push('/gbp')}>
                        <ArrowLeft className="w-4 h-4" /> Back to GBP Dashboard
                    </Button>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                                <Building2 className="w-6 h-6 text-brand-blue-crayola" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">GBP Clients</h1>
                                <p className="text-sm text-muted-foreground">{clients.length} clients · {clients.reduce((sum: number, c: any) => sum + (c.gbp_locations?.length || 0), 0)} total locations</p>
                            </div>
                        </div>
                        <AddGbpClientModal onClientAdded={() => refetch()} />
                    </div>
                </div>

                <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search clients..." className="pl-10 bg-background/50 h-10"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-blue-crayola" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50">
                                <Building2 className="w-10 h-10 mb-2" />
                                <p>{search ? 'No clients match your search.' : 'No clients yet. Click "Add Client" to get started.'}</p>
                            </div>
                        ) : (
                            <div>
                                {filtered.map((client: any) => (
                                    <ClientRow key={client.id} client={client} onRefresh={() => refetch()} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
