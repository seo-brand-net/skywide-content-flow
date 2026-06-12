"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    MapPin, Zap, FileText, CheckCircle2, Clock, Search, RefreshCw, Building2,
    Loader2, ChevronDown, ChevronUp, Check, X, ExternalLink, Image, Download, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GbpPost {
    id: string;
    gbp_client_id: string;
    location_id: string | null;
    post_topic: string;
    post_body: string | null;
    image_prompt: string | null;
    image_url: string | null;
    link_url: string | null;
    status: 'DRAFT' | 'APPROVED' | 'PUBLISHED';
    reviewed_by: string | null;
    generated_at: string | null;
    created_at: string;
    gbp_clients: { name: string } | null;
    gbp_locations: { location_name: string; city: string; state: string } | null;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const cfg = {
        DRAFT: { cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Draft' },
        APPROVED: { cls: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Approved' },
        PUBLISHED: { cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20', label: 'Published' },
    }[status] || { cls: 'bg-muted/10 text-muted-foreground border-muted/20', label: status };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPostsToPdf(posts: GbpPost[], clientName: string) {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><title>${clientName} — GBP Posts</title>
    <style>
        body{font-family:Georgia,serif;max-width:780px;margin:40px auto;color:#111;line-height:1.6}
        h1{font-size:22px;margin-bottom:4px} .meta{color:#666;font-size:13px;margin-bottom:40px}
        .post{border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin-bottom:28px;break-inside:avoid}
        .post h2{font-size:15px;font-weight:700;margin:0 0 6px} .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534}
        .body{font-size:14px;margin:14px 0;white-space:pre-line;color:#374151}
        .meta-row{display:flex;gap:24px;margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6}
        .meta-item label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af}
        .meta-item p{font-size:12px;color:#6b7280;margin:4px 0 0;font-style:italic}
        @media print{body{margin:20px}button{display:none}}
    </style></head><body>
    <h1>${clientName} — GBP Posts</h1>
    <p class="meta">Generated ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · ${posts.length} post${posts.length!==1?'s':''}</p>
    ${posts.map(p => `
        <div class="post">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <h2>${p.post_topic}</h2>
            </div>
            ${p.gbp_locations ? `<p style="font-size:12px;color:#9ca3af;margin:2px 0 0">${p.gbp_locations.location_name}, ${p.gbp_locations.state}</p>` : ''}
            <div class="body">${p.post_body || 'Content pending...'}</div>
            ${p.image_url ? `<div style="margin: 14px 0; text-align: center;"><img src="${p.image_url}" alt="Generated post image" style="max-width:100%;height:auto;border-radius:8px;max-height:300px;object-fit:contain;border:1px solid #e5e7eb;" /></div>` : ''}
            <div class="meta-row">
                <div class="meta-item" style="flex:2"><label>Image Prompt</label><p>${p.image_prompt || '—'}</p></div>
                <div class="meta-item" style="flex:1"><label>Link URL</label><p>${p.link_url || '—'}</p></div>
                <div class="meta-item"><label>Date</label><p>${new Date(p.generated_at||p.created_at).toLocaleDateString()}</p></div>
            </div>
        </div>`).join('')}
    <script>window.onload=()=>window.print()</script></body></html>`;
    win.document.write(html);
    win.document.close();
}

function exportPostsToCsv(posts: GbpPost[], clientName: string) {
    if (posts.length === 0) return;
    const header = ["Topic", "Client", "Location", "Date", "Post Body", "Image Prompt", "Target Link"];
    const rows = posts.map(p => [
        p.post_topic,
        p.gbp_clients?.name || '',
        p.gbp_locations ? `${p.gbp_locations.location_name}, ${p.gbp_locations.state}` : '',
        new Date(p.generated_at || p.created_at).toLocaleDateString(),
        p.post_body || '',
        p.image_prompt || '',
        p.link_url || ''
    ]);
    
    const csvContent = [header, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${clientName.replace(/\s+/g, '_')}_GBP_Posts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GbpPage() {
    const { user } = useAuth();
    const { userRole, loading: roleLoading, isInitialLoading } = useUserRole(user?.id);
    const { toast } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [clientFilter, setClientFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // ── Clients list (for filter dropdown)
    const { data: clients = [] } = useQuery({
        queryKey: ['gbp_clients_all'],
        queryFn: async () => {
            const { data, error } = await supabase.from('gbp_clients').select('id, name').order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    // ── Posts log
    const { data: posts = [], isLoading, refetch } = useQuery({
        queryKey: ['gbp_posts_dashboard', clientFilter],
        queryFn: async () => {
            let q = supabase.from('gbp_posts').select(`
                *,
                gbp_clients(name),
                gbp_locations(location_name, city, state)
            `).order('created_at', { ascending: false }).limit(500);
            if (clientFilter !== 'all') q = q.eq('gbp_client_id', clientFilter);
            const { data, error } = await q;
            if (error) throw error;
            return data as GbpPost[];
        },
        enabled: !!user?.id,
        refetchInterval: 30_000,
    });

    const filtered = useMemo(() => {
        if (!search.trim()) return posts;
        const q = search.toLowerCase();
        return posts.filter(p =>
            p.post_topic.toLowerCase().includes(q) ||
            p.gbp_clients?.name.toLowerCase().includes(q) ||
            p.gbp_locations?.location_name.toLowerCase().includes(q)
        );
    }, [posts, search]);

    // ── Stats
    const totalPosts = posts.length;
    const thisMonth = posts.filter(p => {
        const d = new Date(p.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const isAppLoading = !user && (roleLoading || isInitialLoading);
    if (isAppLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-blue-crayola" /></div>;

    const exportable = clientFilter !== 'all'
        ? filtered
        : [];
    const exportClientName = clients.find((c: any) => c.id === clientFilter)?.name || 'All Clients';

    return (
        <Layout>
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto">

                {/* ── Header */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                                <MapPin className="w-6 h-6 text-brand-blue-crayola" />
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">GBP Automation</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Manage and review content across your client portfolio
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push('/gbp/clients')}>
                            <Settings className="w-4 h-4" /> Manage Clients
                        </Button>
                        <Button
                            onClick={() => router.push('/gbp/generate')}
                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold px-6 h-12 shadow-lg shadow-brand-blue-crayola/20 transition-all hover:scale-105"
                        >
                            <Zap className="w-4 h-4 mr-2" /> Generate Posts
                        </Button>
                    </div>
                </div>

                {/* ── Stats Row */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {[
                        { label: 'Total Posts', value: totalPosts, icon: FileText, color: 'text-brand-blue-crayola', bg: 'bg-brand-blue-crayola/10' },
                        { label: 'This Month', value: thisMonth, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-card border border-border/50 rounded-xl p-5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${stat.bg} rounded-lg`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Posts Table Card */}
                <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search posts..." className="pl-10 bg-background/50 h-10" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Select value={clientFilter} onValueChange={setClientFilter}>
                                    <SelectTrigger className="w-[180px] h-10 bg-background/50"><SelectValue placeholder="All Clients" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Clients</SelectItem>
                                        {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                {clientFilter !== 'all' && exportable.length > 0 && (
                                    <>
                                        <Button variant="outline" size="sm" className="h-10 gap-2 font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => exportPostsToCsv(exportable, exportClientName)}>
                                            <Download className="w-3.5 h-3.5" /> Export CSV ({exportable.length})
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-10 gap-2 font-bold" onClick={() => exportPostsToPdf(exportable, exportClientName)}>
                                            <FileText className="w-3.5 h-3.5" /> Export PDF ({exportable.length})
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" size="sm" className="h-10 gap-2 font-bold" onClick={() => refetch()} disabled={isLoading}>
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-brand-blue-crayola/50" />
                                <p className="text-muted-foreground">Loading posts...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-50">
                                <FileText className="w-10 h-10" />
                                <p className="text-lg font-bold">No content found</p>
                                <p className="text-sm text-muted-foreground">Click "Generate Posts" to create your first batch of content.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-muted/20 border-b border-border/50">
                                            <th className="px-6 py-4 font-bold text-foreground w-[60px] text-center">Img</th>
                                            <th className="px-6 py-4 font-bold text-foreground">Topic</th>
                                            <th className="px-4 py-4 font-bold text-foreground">Client</th>
                                            <th className="px-4 py-4 font-bold text-foreground">Location</th>
                                            <th className="px-4 py-4 font-bold text-foreground">Date</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filtered.map(post => (
                                            <React.Fragment key={post.id}>
                                                <tr className="hover:bg-muted/20 transition-colors group">
                                                    <td className="px-6 py-4 text-center">
                                                        {post.image_url ? (
                                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/50 bg-background inline-flex items-center justify-center">
                                                                <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/50 border-dashed bg-muted/10 inline-flex items-center justify-center text-muted-foreground/30">
                                                                <Image className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-semibold text-foreground text-sm max-w-[300px] truncate">{post.post_topic}</p>
                                                        {post.post_body && <p className="text-xs text-muted-foreground mt-1 max-w-[350px] line-clamp-2 leading-relaxed">{post.post_body}</p>}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm font-medium text-foreground">{post.gbp_clients?.name || '—'}</td>
                                                    <td className="px-4 py-4 text-xs text-muted-foreground">{post.gbp_locations ? `${post.gbp_locations.location_name}, ${post.gbp_locations.state}` : '—'}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-medium text-foreground">{new Date(post.generated_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            <span className="text-[10px] text-muted-foreground">{new Date(post.generated_at || post.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}>
                                                                {expandedId === post.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {expandedId === post.id && (
                                                    <tr className="bg-muted/5">
                                                        <td colSpan={6} className="px-8 py-8 border-t border-border/20 shadow-inner">
                                                            <div className="flex flex-col lg:flex-row gap-10 max-w-6xl items-start">
                                                                <div className="w-full lg:w-[360px] shrink-0">
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Post Preview</p>
                                                                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden font-sans">
                                                                        <div className="p-4 flex items-start gap-3">
                                                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                                                                                {post.gbp_clients?.name?.charAt(0) || 'B'}
                                                                            </div>
                                                                            <div className="mt-0.5">
                                                                                <p className="text-[15px] font-bold text-gray-900 leading-tight tracking-tight">{post.gbp_clients?.name}</p>
                                                                                <p className="text-[13px] text-gray-500 mt-0.5">{post.generated_at ? 'Just now' : 'Just now'} · <span className="opacity-70">🌍</span></p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="px-4 pb-3 text-[14px] text-gray-800 whitespace-pre-line leading-[1.5]">
                                                                            {post.post_body || 'Content pending...'}
                                                                        </div>
                                                                        {post.image_url && (
                                                                            <div className="w-full aspect-square bg-gray-100 border-t border-b border-gray-100 relative">
                                                                                <img src={post.image_url} alt="Post preview" className="absolute inset-0 w-full h-full object-cover" />
                                                                            </div>
                                                                        )}
                                                                        {post.link_url && (
                                                                            <div 
                                                                                className="px-4 py-3.5 bg-gray-50 flex items-center justify-between group hover:bg-gray-100 transition-colors cursor-pointer" 
                                                                                onClick={() => window.open(post.link_url!, '_blank')}
                                                                            >
                                                                                <span className="text-[14px] font-medium text-blue-600 group-hover:underline">Learn more</span>
                                                                                <ExternalLink className="w-4 h-4 text-blue-600 opacity-50" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 space-y-7 pt-1">
                                                                    <div>
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Image Prompt Used</p>
                                                                        <p className="text-sm text-muted-foreground bg-background p-4 rounded-xl border border-border/50 italic leading-relaxed">{post.image_prompt || '—'}</p>
                                                                    </div>
                                                                    {post.link_url && (
                                                                        <div>
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" />Target Link</p>
                                                                            <div className="flex items-center gap-3">
                                                                                <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-blue-crayola hover:underline break-all bg-brand-blue-crayola/5 py-2.5 px-4 rounded-xl border border-brand-blue-crayola/20 truncate max-w-md inline-block">
                                                                                    {post.link_url}
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="pt-5 border-t border-border/50">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export Options</p>
                                                                        <div className="flex gap-3">
                                                                            <Button size="sm" variant="outline" className="h-10 px-5 font-bold gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-sm" onClick={() => exportPostsToCsv([post], post.gbp_clients?.name || 'Post')}>
                                                                                <Download className="w-4 h-4" /> Export as CSV
                                                                            </Button>
                                                                            <Button size="sm" variant="outline" className="h-10 px-5 font-bold gap-2 bg-background shadow-sm hover:bg-muted/50" onClick={() => exportPostsToPdf([post], post.gbp_clients?.name || 'Post')}>
                                                                                <FileText className="w-4 h-4" /> Export as PDF
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
        </Layout>
    );
}
