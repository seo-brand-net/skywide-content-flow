"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    MapPin, Zap, Loader2, ArrowLeft, Building2, CheckCircle2,
    Clock, Image, ExternalLink, FileText, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// ─── Post Card (grid item) ────────────────────────────────────────────────────
function PostCard({ post }: { post: any }) {
    const [expanded, setExpanded] = useState(false);

    const statusCfg = {
        DRAFT: { label: 'Draft', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
        APPROVED: { label: 'Approved', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
        PUBLISHED: { label: 'Published', cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    }[post.status as string] || { label: post.status, cls: 'bg-muted/10 text-muted-foreground border-muted/20' };

    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-brand-blue-crayola/30 hover:shadow-lg transition-all duration-200 flex flex-col">
            {/* Image Prompt Visual / Generated Image */}
            <div className="relative h-48 bg-gradient-to-br from-brand-blue-crayola/10 via-purple-500/5 to-transparent flex items-center justify-center border-b border-border/30 overflow-hidden">
                {post.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={post.image_url} alt={post.post_topic} className="w-full h-full object-cover" />
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-blue-crayola/10 to-transparent" />
                        {post.image_prompt ? (
                            <p className="relative text-[11px] text-muted-foreground italic text-center leading-relaxed line-clamp-4 z-10 px-4">
                                {post.image_prompt}
                            </p>
                        ) : (
                            <Image className="w-8 h-8 text-muted-foreground/30" />
                        )}
                    </>
                )}
                <div className="absolute top-3 right-3 z-20">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusCfg.cls}`}>
                        {statusCfg.label}
                    </span>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-4 flex flex-col flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {post.gbp_locations?.location_name || post.gbp_clients?.name || '—'}
                </p>
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-3 line-clamp-2">
                    {post.post_topic}
                </h3>

                {expanded && post.post_body && (
                    <div className="mb-3 text-xs text-muted-foreground whitespace-pre-line bg-muted/30 rounded-lg p-3 leading-relaxed border border-border/30">
                        {post.post_body}
                    </div>
                )}

                {expanded && post.link_url && (
                    <a href={post.link_url} target="_blank" rel="noopener noreferrer"
                        className="mb-3 flex items-center gap-1.5 text-[11px] text-brand-blue-crayola hover:underline truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {post.link_url}
                    </a>
                )}

                <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                        {new Date(post.generated_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[11px] font-semibold text-brand-blue-crayola hover:underline"
                    >
                        {expanded ? 'Show less' : 'Read post'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Generate Page ───────────────────────────────────────────────────────
export default function GbpGeneratePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState('all');
    const [isTriggering, setIsTriggering] = useState(false);
    const [lastTriggered, setLastTriggered] = useState<string | null>(null);

    // Active clients
    const { data: clients = [], isLoading: clientsLoading } = useQuery({
        queryKey: ['gbp_clients_active'],
        queryFn: async () => {
            const { data, error } = await supabase.from('gbp_clients').select('id, name, industry').eq('is_active', true).order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    // Locations for selected client
    const { data: locations = [] } = useQuery({
        queryKey: ['gbp_locations_generate', selectedClientId],
        queryFn: async () => {
            if (!selectedClientId) return [];
            const { data, error } = await supabase
                .from('gbp_locations')
                .select('id, location_name, city, state, sheet_tab_name')
                .eq('gbp_client_id', selectedClientId)
                .eq('is_active', true)
                .order('location_name');
            if (error) throw error;
            return data;
        },
        enabled: !!selectedClientId,
    });

    // Posts for selected client (right panel grid, polls every 15s)
    const { data: posts = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery({
        queryKey: ['gbp_posts_generate', selectedClientId, selectedLocationId],
        queryFn: async () => {
            if (!selectedClientId) return [];
            let q = supabase.from('gbp_posts').select(`
                *, gbp_clients(name), gbp_locations(location_name, city, state)
            `).eq('gbp_client_id', selectedClientId).order('created_at', { ascending: false }).limit(50);
            if (selectedLocationId !== 'all') q = q.eq('location_id', selectedLocationId);
            const { data, error } = await q;
            if (error) throw error;
            return data;
        },
        enabled: !!selectedClientId,
        refetchInterval: 15_000,
    });

    const isMultiLocation = locations.length > 1;

    const handleClientChange = (val: string) => {
        setSelectedClientId(val);
        setSelectedLocationId('all');
    };

    const handleGenerate = async () => {
        if (!selectedClientId) {
            toast({ title: 'Select a client', variant: 'destructive' });
            return;
        }
        setIsTriggering(true);
        try {
            const payload: any = { client_id: selectedClientId };
            if (isMultiLocation) payload.location_id = selectedLocationId;

            const res = await fetch('/api/gbp/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Trigger failed');

            const locLabel = isMultiLocation && selectedLocationId === 'all'
                ? `all ${data.fired} locations`
                : locations.find((l: any) => l.id === selectedLocationId)?.location_name || 'this location';

            setLastTriggered(new Date().toLocaleTimeString());
            toast({ title: '🚀 Automation Triggered', description: `n8n is generating posts for ${locLabel}. Posts will appear here in real time.` });
            queryClient.invalidateQueries({ queryKey: ['gbp_posts_generate', selectedClientId] });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setIsTriggering(false);
        }
    };

    const currentClient = clients.find((c: any) => c.id === selectedClientId);
    const draftCount = posts.filter((p: any) => p.status === 'DRAFT').length;
    const approvedCount = posts.filter((p: any) => p.status === 'APPROVED').length;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-screen-2xl mx-auto">

                {/* Header */}
                <div className="mb-10">
                    <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-2" onClick={() => router.push('/gbp')}>
                        <ArrowLeft className="w-4 h-4" /> Back to GBP Dashboard
                    </Button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                            <Zap className="w-6 h-6 text-brand-blue-crayola" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">Generate GBP Posts</h1>
                    </div>
                    <p className="text-muted-foreground ml-14">Select a client and trigger the automation — posts appear live as they generate.</p>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── Left Panel: Config ──────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-5">
                        <Card className="bg-card border-border/50 shadow-sm overflow-hidden sticky top-8">
                            <CardHeader className="bg-muted/40 border-b border-border/50 py-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-brand-blue-crayola" /> Client Setup
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">

                                {/* Client Selector */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</Label>
                                    <Select value={selectedClientId} onValueChange={handleClientChange} disabled={clientsLoading}>
                                        <SelectTrigger className="bg-background/50 border-input h-11">
                                            <SelectValue placeholder={clientsLoading ? 'Loading...' : 'Select a client...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <div>
                                                        <p className="font-medium">{c.name}</p>
                                                        <p className="text-xs text-muted-foreground">{c.industry}</p>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Location Selector (multi-location only) */}
                                {selectedClientId && isMultiLocation && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-brand-blue-crayola" /> Location
                                        </Label>
                                        <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                                            <SelectTrigger className="bg-background/50 border-input h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    <div>
                                                        <p className="font-medium">All Locations</p>
                                                        <p className="text-xs text-muted-foreground">{locations.length} locations</p>
                                                    </div>
                                                </SelectItem>
                                                {locations.map((l: any) => (
                                                    <SelectItem key={l.id} value={l.id}>
                                                        <div>
                                                            <p className="font-medium">{l.location_name}</p>
                                                            <p className="text-xs text-muted-foreground">{l.city}, {l.state}{l.sheet_tab_name ? ` · tab: ${l.sheet_tab_name}` : ''}</p>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedLocationId === 'all' && (
                                            <p className="text-[11px] text-brand-blue-crayola bg-brand-blue-crayola/5 border border-brand-blue-crayola/20 rounded-lg px-3 py-2">
                                                Will trigger {locations.length} separate n8n runs — one per location.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Single-location info */}
                                {selectedClientId && !isMultiLocation && locations.length === 1 && (
                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 rounded-lg border border-border/40">
                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">{locations[0].location_name}</p>
                                            <p className="text-[11px] text-muted-foreground">{locations[0].city}, {locations[0].state}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Generate Button */}
                                {selectedClientId && (
                                    <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                                        <Button
                                            onClick={handleGenerate}
                                            disabled={isTriggering}
                                            className="w-full h-12 bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold shadow-lg shadow-brand-blue-crayola/20"
                                        >
                                            {isTriggering
                                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Triggering n8n...</>
                                                : <><Zap className="w-4 h-4 mr-2" />{isMultiLocation && selectedLocationId === 'all' ? `Run All ${locations.length} Locations` : 'Generate Posts'}</>
                                            }
                                        </Button>
                                        {lastTriggered && (
                                            <p className="text-center text-[11px] text-muted-foreground">
                                                Last triggered at {lastTriggered}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Posts mini-stats */}
                                {selectedClientId && posts.length > 0 && (
                                    <div className="border-t border-border/40 pt-4 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Posts This Client</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: 'Total', value: posts.length, color: 'text-foreground' },
                                                { label: 'Draft', value: draftCount, color: 'text-blue-500' },
                                                { label: 'Approved', value: approvedCount, color: 'text-green-500' },
                                            ].map(s => (
                                                <div key={s.label} className="text-center bg-muted/30 rounded-lg py-2">
                                                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right Panel: Posts Grid ─────────────────────────── */}
                    <div className="lg:col-span-9">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {currentClient ? `${currentClient.name} Posts` : 'Generated Posts'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {selectedClientId
                                        ? posts.length > 0
                                            ? `${posts.length} post${posts.length !== 1 ? 's' : ''} — auto-refreshes every 15s`
                                            : 'No posts yet — trigger a generation run to get started'
                                        : 'Select a client to view their posts'}
                                </p>
                            </div>
                            {selectedClientId && (
                                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => refetchPosts()} disabled={postsLoading}>
                                    <RefreshCw className={`w-3.5 h-3.5 ${postsLoading ? 'animate-spin' : ''}`} /> Refresh
                                </Button>
                            )}
                        </div>

                        {!selectedClientId ? (
                            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-border/40 rounded-2xl text-center gap-4">
                                <div className="p-4 bg-muted/30 rounded-full">
                                    <Building2 className="w-10 h-10 text-muted-foreground/40" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">No client selected</p>
                                    <p className="text-sm text-muted-foreground mt-1">Choose a client on the left to see their generated posts</p>
                                </div>
                            </div>
                        ) : postsLoading ? (
                            <div className="flex flex-col items-center justify-center h-80 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-blue-crayola/50" />
                                <p className="text-muted-foreground">Loading posts...</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-border/40 rounded-2xl text-center gap-4">
                                <div className="p-4 bg-brand-blue-crayola/5 rounded-full">
                                    <Zap className="w-10 h-10 text-brand-blue-crayola/40" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">No posts yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">Hit "Generate Posts" to kick off the automation run</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {posts.map((post: any) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
