"use client";

import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Globe,
    CheckCircle2,
    AlertCircle,
    Clock,
    ExternalLink,
    RefreshCw,
    Loader2,
    Play,
    RotateCcw,
    TrendingUp,
    Search,
    Zap,
    ChevronDown,
    ChevronUp,
    ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AddIndexingClientModal } from '@/components/indexing/AddIndexingClientModal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IndexingClient {
    id: string;
    name: string;
    workbook_url: string;
    tab_name: string;
    gsc_property: string;
    bing_site_url: string | null;
    is_active: boolean;
    last_run_at: string | null;
    created_at: string;
}

interface GoogleSummary {
    new_urls?: number;
    existing_urls?: number;
    submitted?: number;
    errors?: number;
    rate_limited?: number;
    [key: string]: any;
}

interface BingSummary {
    submitted?: number;
    errors?: number;
    [key: string]: any;
}

interface IndexingRun {
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
}

interface RunResult {
    success: boolean;
    run_id: string;
    google_summary: GoogleSummary | null;
    bing_summary: BingSummary | null;
    message: string;
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IndexingRun['status'] }) {
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

function TriggeredByBadge({ triggeredBy }: { triggeredBy: string }) {
    const isScheduled = triggeredBy === 'scheduled';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isScheduled
            ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            : 'bg-brand-blue-crayola/10 text-brand-blue-crayola border-brand-blue-crayola/20'
        }`}>
            {isScheduled ? <RotateCcw className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            {isScheduled ? 'Scheduled' : 'Manual'}
        </span>
    );
}

function GoogleSummaryCard({ summary }: { summary: GoogleSummary }) {
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

function BingSummaryCard({ summary, skipped }: { summary: BingSummary | null; skipped?: boolean }) {
    if (skipped || !summary) {
        return (
            <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border/40 flex items-center gap-3 opacity-60">
                <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                <span className="text-xs text-muted-foreground italic">Bing not configured — skipped</span>
            </div>
        );
    }

    return (
        <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex-shrink-0" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Bing Indexing</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                    <p className="text-xl font-bold text-brand-blue-crayola">{summary.submitted ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Submitted</p>
                </div>
                <div className="text-center">
                    <p className="text-xl font-bold text-destructive">{summary.errors ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Errors</p>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function IndexingRunPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { userRole, loading: roleLoading, isInitialLoading } = useUserRole(user?.id);

    const [selectedClientId, setSelectedClientId] = useState('');
    const [latestResult, setLatestResult] = useState<RunResult | null>(null);
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

    // ── Queries ──────────────────────────────────────────────────────────────

    const { data: clients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ['indexing_clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('indexing_clients')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data as IndexingClient[];
        },
        enabled: !!user?.id
    });

    const { data: runs = [], isLoading: isLoadingRuns, refetch: refetchRuns } = useQuery({
        queryKey: ['indexing_runs', selectedClientId],
        queryFn: async () => {
            if (!selectedClientId) return [];
            const { data, error } = await supabase
                .from('indexing_runs')
                .select('*')
                .eq('indexing_client_id', selectedClientId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data as IndexingRun[];
        },
        enabled: !!selectedClientId && !!user?.id
    });

    // ── Derived state ────────────────────────────────────────────────────────

    const currentClient = clients.find(c => c.id === selectedClientId) || null;
    const isAppLoading = !user && (roleLoading || isInitialLoading);

    // ── Mutations ────────────────────────────────────────────────────────────

    const runMutation = useMutation({
        mutationFn: async (client: IndexingClient): Promise<RunResult> => {
            const response = await fetch('/api/proxy-indexing-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    indexing_client_id: client.id,
                    workbook_url: client.workbook_url,
                    tab_name: client.tab_name,
                    gsc_property: client.gsc_property,
                    bing_site_url: client.bing_site_url,
                    triggered_by: 'manual',
                    user_id: user?.id || null
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || result.error || 'Indexing run failed');
            }
            return result as RunResult;
        },
        onSuccess: (result) => {
            setLatestResult(result);
            toast({
                title: '✅ Indexing Complete',
                description: result.message || 'URLs submitted successfully.',
            });
            queryClient.invalidateQueries({ queryKey: ['indexing_runs', selectedClientId] });
            queryClient.invalidateQueries({ queryKey: ['indexing_runs_all'] });
        },
        onError: (error: any) => {
            toast({
                title: 'Indexing Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive'
            });
        }
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleRunIndexing = () => {
        if (!currentClient) {
            toast({
                title: 'No Client Selected',
                description: 'Please select a client before running indexing.',
                variant: 'destructive'
            });
            return;
        }
        setLatestResult(null);
        runMutation.mutate(currentClient);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ── Loading state ─────────────────────────────────────────────────────────

    if (isAppLoading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-screen-2xl mx-auto space-y-8">
                    <Skeleton className="h-12 w-64" />
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-3 space-y-4">
                            <Skeleton className="h-64 w-full" />
                        </div>
                        <div className="col-span-9">
                            <Skeleton className="h-[500px] w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-screen-2xl mx-auto">

                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-2"
                            onClick={() => router.push('/indexing')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Indexing History
                        </Button>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                                <Zap className="w-6 h-6 text-brand-blue-crayola" />
                            </div>
                            <h1 className="text-4xl font-bold seobrand-title seobrand-title-accent">
                                Run Indexing
                            </h1>
                        </div>
                        <p className="seobrand-description text-lg">
                            Select a client and manually trigger URL submission to Google & Bing.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['indexing_clients'] })}
                            disabled={isLoadingClients}
                            title="Refresh clients"
                        >
                            <RotateCcw className={`w-4 h-4 ${isLoadingClients ? 'animate-spin' : ''}`} />
                        </Button>
                        <AddIndexingClientModal
                            onClientAdded={() => queryClient.invalidateQueries({ queryKey: ['indexing_clients'] })}
                        />
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── Left Panel: Controls ──────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-5">
                        <Card className="bg-card border-border hover-glow overflow-hidden">
                            <CardHeader className="bg-muted/50 border-b border-border/50">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-brand-blue-crayola" />
                                    Client Selection
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Client Dropdown */}
                                <div className="space-y-3">
                                    <Label htmlFor="indexing-client-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Active Client
                                    </Label>
                                    <Select
                                        onValueChange={(id) => {
                                            setSelectedClientId(id);
                                            setLatestResult(null);
                                        }}
                                        value={selectedClientId}
                                    >
                                        <SelectTrigger id="indexing-client-select" className="bg-background/50 border-input h-11">
                                            <SelectValue placeholder={
                                                isLoadingClients ? 'Loading clients...' : 'Select a client...'
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(client => (
                                                <SelectItem key={client.id} value={client.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{client.name}</span>
                                                        {!client.is_active && (
                                                            <Badge variant="secondary" className="text-[9px]">Paused</Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Client Details (shown when selected) */}
                                {currentClient && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        {/* Workbook Link */}
                                        <Button
                                            variant="outline"
                                            className="w-full flex items-center gap-2 h-9 text-xs justify-start"
                                            asChild
                                        >
                                            <a href={currentClient.workbook_url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-3 h-3 text-brand-blue-crayola" />
                                                Open Workbook Tab
                                            </a>
                                        </Button>

                                        {/* Run Indexing CTA */}
                                        <Button
                                            className="w-full h-12 bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold text-sm shadow-lg shadow-brand-blue-crayola/20"
                                            onClick={handleRunIndexing}
                                            disabled={runMutation.isPending}
                                            id="run-indexing-btn"
                                        >
                                            {runMutation.isPending ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Submitting URLs...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4" />
                                                    Run Indexing
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {/* Empty state */}
                                {clients.length === 0 && !isLoadingClients && (
                                    <div className="text-center py-6 opacity-50">
                                        <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">No indexing clients yet.</p>
                                        <p className="text-xs text-muted-foreground">Click "Add Client" to get started.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right Panel: Results & Run History ───────────────── */}
                    <div className="lg:col-span-9 space-y-6">

                        {/* Latest Run Results Card (shown after a manual run) */}
                        {(runMutation.isPending || latestResult) && (
                            <Card className="bg-card border-brand-blue-crayola/20 shadow-lg shadow-brand-blue-crayola/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                <CardHeader className="bg-brand-blue-crayola/5 border-b border-brand-blue-crayola/10 py-4">
                                    <CardTitle className="text-base flex items-center gap-2.5">
                                        <TrendingUp className="w-4 h-4 text-brand-blue-crayola" />
                                        {runMutation.isPending ? 'Running Indexing...' : 'Latest Run Results'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {runMutation.isPending ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                                            <div className="relative">
                                                <Globe className="w-12 h-12 text-brand-blue-crayola/20" />
                                                <Loader2 className="w-6 h-6 text-brand-blue-crayola animate-spin absolute top-3 left-3" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground mb-1">Submitting URLs to search engines...</p>
                                                <p className="text-xs text-muted-foreground">
                                                    This may take 15-60 seconds depending on the client's URL count.
                                                </p>
                                            </div>
                                        </div>
                                    ) : latestResult ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-muted-foreground">{latestResult.message}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {latestResult.google_summary ? (
                                                    <GoogleSummaryCard summary={latestResult.google_summary} />
                                                ) : (
                                                    <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border/40 opacity-50 text-xs text-muted-foreground italic">
                                                        No Google summary returned
                                                    </div>
                                                )}
                                                <BingSummaryCard
                                                    summary={latestResult.bing_summary}
                                                    skipped={!currentClient?.bing_site_url || !latestResult.bing_summary}
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        )}

                        {/* Run History Table */}
                        <Card className="bg-card/50 backdrop-blur-md border-border min-h-[400px]">
                            <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0 py-4">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-brand-blue-crayola" />
                                    Run History
                                    {selectedClientId && (
                                        <span className="text-xs text-muted-foreground font-normal ml-1">
                                            — {currentClient?.name}
                                        </span>
                                    )}
                                </CardTitle>
                                {selectedClientId && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[10px] font-bold uppercase gap-2 border-brand-blue-crayola/30 text-brand-blue-crayola hover:bg-brand-blue-crayola/5"
                                        onClick={() => refetchRuns()}
                                        disabled={isLoadingRuns}
                                    >
                                        <RefreshCw className={`w-3 h-3 ${isLoadingRuns ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </Button>
                                )}
                            </CardHeader>

                            <CardContent className="p-0">
                                {!selectedClientId ? (
                                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 opacity-50">
                                        <div className="p-4 bg-muted rounded-full">
                                            <Search className="w-10 h-10 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Select a client</h3>
                                            <p className="text-xs max-w-xs mx-auto text-muted-foreground">
                                                Choose a client from the left panel to view their run history.
                                            </p>
                                        </div>
                                    </div>
                                ) : isLoadingRuns ? (
                                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-blue-crayola/50" />
                                        <span className="text-sm text-muted-foreground">Loading run history...</span>
                                    </div>
                                ) : runs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 opacity-50">
                                        <Globe className="w-10 h-10 text-muted-foreground" />
                                        <div>
                                            <h3 className="text-lg font-bold">No runs yet</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Click "Run Indexing" to trigger the first manual run.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="bg-muted/30 border-b border-border/50">
                                                    <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Trigger</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-center">Google</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-center">Bing</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-center">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {runs.map((run) => (
                                                    <>
                                                        <tr
                                                            key={run.id}
                                                            className="hover:bg-muted/20 transition-colors"
                                                        >
                                                            <td className="px-5 py-4 whitespace-nowrap">
                                                                <div className="font-medium text-foreground">
                                                                    {new Date(run.created_at).toLocaleDateString('en-US', {
                                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                                    })}
                                                                </div>
                                                                <div className="text-muted-foreground text-[10px]">
                                                                    {new Date(run.created_at).toLocaleTimeString('en-US', {
                                                                        hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <TriggeredByBadge triggeredBy={run.triggered_by} />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <StatusBadge status={run.status} />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {run.google_summary ? (
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <span className="text-green-500 font-bold">
                                                                            +{run.google_summary.new_urls ?? 0}
                                                                        </span>
                                                                        <span className="text-muted-foreground text-[10px]">new</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {run.bing_summary ? (
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <span className="text-blue-500 font-bold">
                                                                            {run.bing_summary.submitted ?? 0}
                                                                        </span>
                                                                        <span className="text-muted-foreground text-[10px]">submitted</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-[10px] italic">skipped</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => setExpandedRunId(
                                                                        expandedRunId === run.id ? null : run.id
                                                                    )}
                                                                >
                                                                    {expandedRunId === run.id
                                                                        ? <ChevronUp className="w-3.5 h-3.5" />
                                                                        : <ChevronDown className="w-3.5 h-3.5" />
                                                                    }
                                                                </Button>
                                                            </td>
                                                        </tr>

                                                        {expandedRunId === run.id && (
                                                            <tr key={`${run.id}-details`} className="bg-muted/10">
                                                                <td colSpan={6} className="px-6 py-5">
                                                                    <div className="space-y-4">
                                                                        {run.status === 'error' && run.error_message && (
                                                                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                                                                <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-1">Error</p>
                                                                                <p className="text-xs text-foreground/80">{run.error_message}</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                                                                            {run.google_summary ? (
                                                                                <GoogleSummaryCard summary={run.google_summary} />
                                                                            ) : (
                                                                                <p className="text-xs text-muted-foreground italic">No Google data</p>
                                                                            )}
                                                                            <BingSummaryCard
                                                                                summary={run.bing_summary}
                                                                                skipped={!run.bing_summary}
                                                                            />
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
            </div>
        </div>
    );
}
