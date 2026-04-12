"use client";

import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Globe,
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
    Play,
    RotateCcw,
    TrendingUp,
    Search,
    Zap,
    ChevronDown,
    ChevronUp,
    Filter,
    RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GoogleSummary {
    new_urls?: number;
    existing_urls?: number;
    submitted?: number;
    errors?: number;
    rate_limited?: number;
}

interface BingSummary {
    submitted?: number;
    errors?: number;
    new_urls?: number;
    existing_urls?: number;
    rate_limited?: number;
    [key: string]: any;
}

interface IndexingRunRow {
    id: string;
    indexing_client_id: string;
    triggered_by: 'manual' | 'scheduled';
    status: 'pending' | 'success' | 'error';
    google_summary: GoogleSummary | null;
    bing_summary: BingSummary | null;
    error_message: string | null;
    error_details: any;
    created_at: string;
    completed_at: string | null;
    user_id: string | null;
    // Joined fields
    indexing_clients: {
        name: string;
        gsc_property: string;
    } | null;
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IndexingRunRow['status'] }) {
    const config = {
        success: { label: 'Success', class: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
        error: { label: 'Error', class: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
        pending: { label: 'Pending', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock }
    }[status] || { label: status, class: 'bg-muted/10 text-muted-foreground border-muted/20', icon: Clock };

    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.class}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

function TriggerCell({ run, profilesMap }: {
    run: IndexingRunRow;
    profilesMap: Record<string, { id: string; full_name: string | null; email: string | null }>;
}) {
    const isScheduled = run.triggered_by === 'scheduled';
    const profile = run.user_id ? profilesMap[run.user_id] : null;
    const displayName = isScheduled
        ? 'Skywide'
        : (profile?.full_name || profile?.email || 'Manual');

    return (
        <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border w-fit ${
                isScheduled
                    ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                    : 'bg-brand-blue-crayola/10 text-brand-blue-crayola border-brand-blue-crayola/20'
            }`}>
                {isScheduled ? <RotateCcw className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                {isScheduled ? 'Auto' : 'Manual'}
            </span>
            <span className="text-[11px] text-muted-foreground">{displayName}</span>
        </div>
    );
}

function GoogleSummaryCompact({ summary }: { summary: GoogleSummary }) {
    return (
        <div className="flex flex-col items-center gap-0.5">
            <span className="text-green-500 font-bold text-[13px]">
                +{summary.new_urls ?? 0} <span className="font-normal text-[10px] text-green-600/70">new</span>
            </span>
            <span className="text-muted-foreground text-[10px]">{summary.submitted ?? 0} submitted</span>
        </div>
    );
}

function GoogleSummaryFull({ summary }: { summary: GoogleSummary }) {
    const stats = [
        { label: 'New URLs', value: summary.new_urls ?? '—', color: 'text-green-500' },
        { label: 'Existing', value: summary.existing_urls ?? '—', color: 'text-blue-500' },
        { label: 'Submitted', value: summary.submitted ?? '—', color: 'text-brand-blue-crayola' },
        { label: 'Errors', value: summary.errors ?? '—', color: 'text-destructive' },
        { label: 'Rate Limited', value: summary.rate_limited ?? '—', color: 'text-yellow-500' },
    ];
    return (
        <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex-shrink-0" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Google Indexing</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
                {stats.map(stat => (
                    <div key={stat.label} className="text-center">
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BingSummaryFull({ summary }: { summary: BingSummary | null }) {
    if (!summary) {
        return (
            <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border/40 flex items-center gap-3 opacity-60">
                <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                <span className="text-xs text-muted-foreground italic">Bing not configured — skipped</span>
            </div>
        );
    }
    const stats = [
        { label: 'New URLs',    value: summary.new_urls ?? '—',    color: 'text-green-500' },
        { label: 'Existing',    value: summary.existing_urls ?? '—', color: 'text-blue-500' },
        { label: 'Submitted',   value: summary.submitted ?? '—',   color: 'text-brand-blue-crayola' },
        { label: 'Errors',      value: summary.errors ?? '—',      color: 'text-destructive' },
        { label: 'Rate Limited',value: summary.rate_limited ?? '—', color: 'text-yellow-500' },
    ];

    return (
        <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex-shrink-0" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Bing Indexing</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
                {stats.map(stat => (
                    <div key={stat.label} className="text-center">
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IndexingHistoryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { userRole, loading: roleLoading, isInitialLoading } = useUserRole(user?.id);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

    // ── Query ─────────────────────────────────────────────────────────────────

    const { data: runs = [], isLoading, refetch } = useQuery({
        queryKey: ['indexing_runs_all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('indexing_runs')
                .select(`
                    *,
                    indexing_clients ( name, gsc_property )
                `)
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            return data as IndexingRunRow[];
        },
        enabled: !!user?.id,
        refetchInterval: 30_000
    });

    // ── Resolve user names separately (user_id → profiles) ───────────────────
    // We can't join profiles via user_id directly (FK is to auth.users).
    // Instead, collect unique user_ids and look them up in profiles.
    const userIds = useMemo(() => {
        const ids = runs
            .map(r => r.user_id)
            .filter((id): id is string => !!id);
        return [...new Set(ids)];
    }, [runs]);

    const { data: profilesMap = {} } = useQuery({
        queryKey: ['profiles_by_ids', userIds],
        queryFn: async () => {
            if (userIds.length === 0) return {};
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);
            if (error) return {};
            return Object.fromEntries(
                (data || []).map(p => [p.id, p])
            ) as Record<string, { id: string; full_name: string | null; email: string | null }>;
        },
        enabled: userIds.length > 0
    });

    // ── Derived ───────────────────────────────────────────────────────────────

    const filteredRuns = useMemo(() => {
        let result = runs;
        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r => {
                const profile = r.user_id ? profilesMap[r.user_id] : null;
                return (
                    r.indexing_clients?.name?.toLowerCase().includes(q) ||
                    profile?.full_name?.toLowerCase().includes(q) ||
                    profile?.email?.toLowerCase().includes(q)
                );
            });
        }
        return result;
    }, [runs, statusFilter, searchTerm, profilesMap]);

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // ── Stats ─────────────────────────────────────────────────────────────────

    const totalSuccess = runs.filter(r => r.status === 'success').length;
    const totalErrors = runs.filter(r => r.status === 'error').length;
    const totalUrlsSubmitted = runs.reduce((sum, r) => sum + (r.google_summary?.submitted ?? 0), 0);

    // ── Loading ───────────────────────────────────────────────────────────────

    const isAppLoading = !user && (roleLoading || isInitialLoading);

    if (isAppLoading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                                <Globe className="w-6 h-6 text-brand-blue-crayola" />
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">
                                Indexing Automation
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            {runs.length} indexing {runs.length === 1 ? 'run' : 'runs'} across all clients
                        </p>
                    </div>

                    <Button
                        onClick={() => router.push('/indexing/run')}
                        className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold px-6 h-12 shadow-lg shadow-brand-blue-crayola/20 transition-all hover:scale-105"
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        Run Indexing
                    </Button>
                </div>

                {/* ── Stats Row ───────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-card border border-border/50 rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{totalUrlsSubmitted.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">URLs Submitted</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border border-border/50 rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{totalSuccess}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Successful Runs</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border border-border/50 rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-destructive/10 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{totalErrors}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Failed Runs</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Table Card ──────────────────────────────────────────── */}
                <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Search */}
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by client or user..."
                                    className="pl-10 bg-background/50 border-border/50 h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Filter className="w-4 h-4" />
                                    Filter:
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="error">Failed</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>

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
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-brand-blue-crayola/50" />
                                <p className="text-muted-foreground font-medium">Loading indexing history...</p>
                            </div>
                        ) : filteredRuns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-50">
                                <Search className="w-10 h-10" />
                                <p className="text-lg font-bold">No runs found</p>
                                <p className="text-sm text-muted-foreground">
                                    {runs.length === 0 ? 'Click "Run Indexing" to trigger the first run.' : 'Try adjusting your search or filters.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                        <tr className="bg-muted/20 border-b border-border/50">
                                            <th className="px-6 py-4 font-bold text-foreground text-sm">Client</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-sm">Triggered By</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-sm text-center">Status</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-sm text-center">Google</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-sm text-center">Bing</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-sm">Date</th>
                                            <th className="px-4 py-4 font-bold text-foreground text-sm text-center">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filteredRuns.map((run) => (
                                            <>
                                                <tr
                                                    key={run.id}
                                                    className="hover:bg-muted/30 transition-colors group"
                                                >
                                                    {/* Client */}
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-foreground text-xs group-hover:text-brand-blue-crayola transition-colors">
                                                                {run.indexing_clients?.name || 'Unknown Client'}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                {run.indexing_clients?.gsc_property}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Triggered By */}
                                                    <td className="px-4 py-5">
                                                        <TriggerCell run={run} profilesMap={profilesMap} />
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-5 text-center">
                                                        <StatusBadge status={run.status} />
                                                    </td>

                                                    {/* Google compact */}
                                                    <td className="px-4 py-5 text-center">
                                                        {run.google_summary ? (
                                                            <GoogleSummaryCompact summary={run.google_summary} />
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Bing compact */}
                                                    <td className="px-4 py-5 text-center">
                                                        {run.bing_summary ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="text-blue-500 font-bold text-[13px]">
                                                                    +{run.bing_summary.new_urls ?? 0} <span className="font-normal text-[10px] text-blue-600/70">new</span>
                                                                </span>
                                                                <span className="text-muted-foreground text-[10px]">{run.bing_summary.submitted ?? 0} submitted</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[10px] italic">skipped</span>
                                                        )}
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-4 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-medium text-foreground text-xs">
                                                                {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(run.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Expand */}
                                                    <td className="px-4 py-5 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                                                        >
                                                            {expandedRunId === run.id
                                                                ? <ChevronUp className="w-3.5 h-3.5" />
                                                                : <ChevronDown className="w-3.5 h-3.5" />
                                                            }
                                                        </Button>
                                                    </td>
                                                </tr>

                                                {/* Expanded row */}
                                                {expandedRunId === run.id && (
                                                    <tr key={`${run.id}-exp`} className="bg-muted/10">
                                                        <td colSpan={7} className="px-8 py-6">
                                                            <div className="space-y-4 max-w-3xl">
                                                                {run.status === 'error' && run.error_message && (
                                                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                                                        <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-1">Error</p>
                                                                        <p className="text-xs text-foreground/80">{run.error_message}</p>
                                                                    </div>
                                                                )}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {run.google_summary
                                                                        ? <GoogleSummaryFull summary={run.google_summary} />
                                                                        : <p className="text-xs text-muted-foreground italic">No Google data</p>
                                                                    }
                                                                    <BingSummaryFull summary={run.bing_summary} />
                                                                </div>
                                                                {run.completed_at && (
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        Completed: {formatDate(run.completed_at)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
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
