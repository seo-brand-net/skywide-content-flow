"use client";

import { useAuth } from '@/hooks/useAuth';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Sparkles,
    FolderOpen,
    CheckCircle2,
    Search,
    ExternalLink,
    Table as TableIcon,
    Clock,
    AlertCircle,
    RotateCcw,
    Trash2,
    RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { AddClientModal } from '@/components/clients/AddClientModal';
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Client {
    id: string;
    name: string;
    workbook_url: string;
    folder_url: string;
    folder_id: string;
}

interface WorkbookRow {
    id: string;
    url: string;
    url_type: string;
    page_type: string;
    primary_keyword: string;
    secondary_keyword: string;
    longtail_keywords?: string;
    location?: string;
    intent?: string;
    status: string;
    brief_url: string;
    run_id: string;
    notes?: string;
    created_at: string;
}

export default function ContentBriefsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedClient, setSelectedClient] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Queries
    const { data: clients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as Client[];
        }
    });

    const { data: workbookRows = [], isLoading: isLoadingRows, refetch: refetchRows } = useQuery({
        queryKey: ['workbook_rows', selectedClient],
        queryFn: async () => {
            if (!selectedClient) return [];
            const { data, error } = await supabase
                .from('workbook_rows')
                .select('*')
                .eq('client_id', selectedClient)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as WorkbookRow[];
        },
        enabled: !!selectedClient
    });

    // Mutations
    const automationMutation = useMutation({
        mutationFn: async ({ client }: { client: Client }) => {
            // 1. Call Apps Script to Generate (Batch Mode)
            const spreadsheetId = client.workbook_url?.match(/[-\w]{25,}/)?.[0];

            const response = await fetch('/api/proxy-apps-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'runBriefGeneration',
                    workbookUrl: client.workbook_url,
                    spreadsheetId,
                    folderId: client.folder_id
                }),
            });

            const result = await response.json();
            if (!response.ok || result.status === 'error') throw new Error(result.message || 'Automation failed');

            return result;
        },
        onSuccess: () => {
            toast({
                title: "Research Engine Triggered",
                description: "Deep content analysis has started for all new rows in the workbook.",
                variant: "default",
            });
            // 2. Trigger a sync to show the newest statuses
            if (currentClient) syncMutation.mutate(currentClient);
        },
        onError: (error) => {
            toast({
                title: "Automation Failed",
                description: error.message || "The research engine encountered an error.",
                variant: "destructive",
            });
        }
    });

    const syncMutation = useMutation({
        mutationFn: async (client: Client) => {
            const response = await fetch('/api/proxy-apps-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'getWorkbookData',
                    workbookUrl: client.workbook_url
                }),
            });

            const result = await response.json();
            if (!response.ok || result.status === 'error') throw new Error(result.message || 'Sync failed');

            const rows = result.result.rows;
            if (rows && rows.length > 0) {
                // Deduplicate by primary_keyword to avoid Supabase upsert conflicts
                const uniqueRows = new Map();

                rows.forEach((r: any) => {
                    const key = r.primary_keyword?.trim();
                    if (!key) return;

                    uniqueRows.set(key, {
                        client_id: client.id,
                        url: r.url,
                        url_type: r.url_type,
                        page_type: r.page_type,
                        primary_keyword: key,
                        secondary_keyword: r.secondary_keyword,
                        longtail_keywords: r.longtail_keywords,
                        location: r.location,
                        intent: r.intent,
                        status: r.status || 'DONE',
                        brief_url: r.brief_url,
                        run_id: r.run_id,
                        notes: r.notes
                    });
                });

                const dbRows = Array.from(uniqueRows.values());

                if (dbRows.length > 0) {
                    const { error: upsertError } = await supabase
                        .from('workbook_rows')
                        .upsert(dbRows, { onConflict: 'client_id,primary_keyword' });

                    if (upsertError) throw upsertError;
                }
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workbook_rows', selectedClient] });
            toast({
                title: "Sync Complete",
                description: "Workbook data is now up to date with the latest changes.",
            });
        },
        onError: (error) => {
            toast({
                title: "Sync Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });


    const deleteMutation = useMutation({
        mutationFn: async (rowId: string) => {
            const { error } = await supabase.from('workbook_rows').delete().eq('id', rowId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workbook_rows', selectedClient] });
            toast({
                title: "Row Deleted",
                description: "The row has been removed from your workspace history.",
            });
        }
    });


    const currentClient = clients.find(c => c.id === selectedClient);

    const handleRunAutomation = () => {
        if (!selectedClient || !currentClient) {
            toast({
                title: "No Client Selected",
                description: "Please choose a client from the list before running automation.",
                variant: "destructive",
            });
            return;
        }
        automationMutation.mutate({ client: currentClient });
    };

    const filteredRows = useMemo(() => {
        return workbookRows.filter(row =>
            row.primary_keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.secondary_keyword?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.page_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.url?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [workbookRows, searchQuery]);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                            <div className="p-2 bg-brand-blue-crayola/10 rounded-lg">
                                <Sparkles className="w-6 h-6 text-brand-blue-crayola" />
                            </div>
                            <h1 className="text-4xl font-bold seobrand-title seobrand-title-accent">
                                Content Brief Automation
                            </h1>
                        </div>
                        <p className="seobrand-description max-w-2xl text-lg">
                            Select a client to manage their content briefs or add a new one.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
                            disabled={isLoadingClients}
                        >
                            <RotateCcw className={`w-4 h-4 ${isLoadingClients ? 'animate-spin' : ''}`} />
                        </Button>
                        <AddClientModal onClientAdded={() => queryClient.invalidateQueries({ queryKey: ['clients'] })} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Control Panel (Left) */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="bg-card border-border hover-glow overflow-hidden">
                            <CardHeader className="bg-muted/50 border-b border-border/50">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-brand-blue-crayola" />
                                    Client Selection
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="space-y-3">
                                    <Label htmlFor="client-select" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        Active Client
                                    </Label>
                                    <Select onValueChange={setSelectedClient} value={selectedClient}>
                                        <SelectTrigger id="client-select" className="bg-background/50 border-input h-12">
                                            <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Choose from 70+ clients..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(client => (
                                                <SelectItem key={client.id} value={client.id}>
                                                    {client.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {currentClient && (
                                    <div className="space-y-4 animate-in fade-in duration-500">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button variant="outline" className="flex items-center gap-2 h-10 text-xs" asChild>
                                                <a href={currentClient.workbook_url} target="_blank" rel="noopener noreferrer" title="Opens the Content Brief tab in the client workbook">
                                                    <ExternalLink className="w-3 h-3" />
                                                    Workbook Tab
                                                </a>
                                            </Button>
                                            <Button variant="outline" className="flex items-center gap-2 h-10 text-xs" asChild>
                                                <a href={currentClient.folder_url || (currentClient.folder_id ? `https://drive.google.com/drive/folders/${currentClient.folder_id}` : '#')} target="_blank" rel="noopener noreferrer">
                                                    <FolderOpen className="w-3 h-3" />
                                                    Drive Folder
                                                </a>
                                            </Button>
                                        </div>

                                        <div className="space-y-4 pt-4">


                                            <Button
                                                className="w-full h-12 bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold text-sm shadow-lg shadow-brand-blue-crayola/20"
                                                onClick={handleRunAutomation}
                                                disabled={automationMutation.isPending}
                                            >
                                                {automationMutation.isPending ? (
                                                    <span className="flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        Processing Workbook...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" />
                                                        Trigger Research Engine
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tracker Section (Right) */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="bg-card/50 backdrop-blur-md border-border min-h-[500px]">
                            <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0 py-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TableIcon className="w-5 h-5 text-brand-blue-crayola" />
                                    Workbook Sheet Canvas
                                </CardTitle>
                                {selectedClient && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[10px] font-bold uppercase gap-2 border-brand-blue-crayola/30 text-brand-blue-crayola hover:bg-brand-blue-crayola/5"
                                        onClick={() => {
                                            if (currentClient) syncMutation.mutate(currentClient);
                                        }}
                                        disabled={syncMutation.isPending}
                                    >
                                        <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                        Sync from Workbook
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search keywords, URLs, or page types..."
                                            className="h-9 pl-9 text-xs bg-background/50"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {selectedClient ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="bg-muted/30 border-b border-border/50">
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider border-r border-border/10">Type</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider border-r border-border/10">Primary Keyword</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider border-r border-border/10">Target URL</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider border-r border-border/10">Intent/Loc</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider border-r border-border/10 text-center">Status</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider border-r border-border/10">Output</th>
                                                    <th className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {(isLoadingRows || syncMutation.isPending) && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-3 animate-pulse">
                                                                <RefreshCw className="w-8 h-8 animate-spin text-brand-blue-crayola/50" />
                                                                <span className="font-medium">Streaming live data from Google Sheets...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {!(isLoadingRows || syncMutation.isPending) && filteredRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
                                                            {searchQuery ? `No results matching "${searchQuery}"` : "No workbook history found for this client. Click 'Sync from Workbook' to pull data."}
                                                        </td>
                                                    </tr>
                                                )}
                                                {!(isLoadingRows || syncMutation.isPending) && filteredRows.map((row) => (
                                                    <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                                                        <td className="px-4 py-3 border-r border-border/5 capitalize font-medium">{row.page_type}</td>
                                                        <td className="px-4 py-3 border-r border-border/5">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{row.primary_keyword}</span>
                                                                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{row.secondary_keyword || '---'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-border/5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                                            <span className="text-muted-foreground italic">{row.url || '---'}</span>
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-border/5">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-1.5 py-0.5 bg-blue-500/5 text-blue-500 rounded border border-blue-500/10 w-fit text-[9px] uppercase font-bold">{row.intent || 'Info'}</span>
                                                                <span className="text-[9px] text-muted-foreground">{row.location || 'Global'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-border/5 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1 border ${row.status === 'DONE' || row.status === 'SUCCESS'
                                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                                : row.status === 'IN_PROGRESS' || row.status === 'NEW'
                                                                    ? 'bg-brand-blue-crayola/10 text-brand-blue-crayola border-brand-blue-crayola/20'
                                                                    : 'bg-destructive/10 text-destructive border-destructive/20'
                                                                }`}>
                                                                {(row.status === 'DONE' || row.status === 'SUCCESS') && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                                {(row.status === 'IN_PROGRESS' || row.status === 'NEW') && <Clock className="w-2.5 h-2.5 animate-pulse" />}
                                                                {row.status === 'ERROR' && <AlertCircle className="w-2.5 h-2.5" />}
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 border-r border-border/5">
                                                            {row.brief_url ? (
                                                                <a href={row.brief_url} target="_blank" rel="noopener noreferrer" className="text-brand-blue-crayola hover:underline flex items-center gap-1 font-bold">
                                                                    DOC <ExternalLink className="w-2.5 h-2.5" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted-foreground">---</span>
                                                            )}
                                                            <div className="text-[9px] text-muted-foreground mt-1 opacity-50 font-mono">{row.run_id?.substring(0, 8)}...</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This action cannot be undone. This will permanently delete this row
                                                                            from your local workspace history.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => deleteMutation.mutate(row.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="p-6 text-center">
                                            <p className="text-xs text-muted-foreground">
                                                This table mirrors the <strong>Content Brief Automation</strong> tab in {currentClient?.name}'s workbook.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 opacity-50">
                                        <div className="p-4 bg-muted rounded-full">
                                            <Search className="w-10 h-10 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Waiting for selection</h3>
                                            <p className="text-xs max-w-xs mx-auto">Select a client to see their specific workbook activity and folder connections.</p>
                                        </div>
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

// Mock Link icon
function Link(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    )
}

// Mock Link icon since I didn't import it
