"use client";

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Clock, ExternalLink, Search, Loader2, Sparkles, Filter, CheckCircle2, AlertCircle, TableIcon } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePusherGlobalBriefUpdates } from '@/hooks/usePusherGlobalBriefUpdates';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

interface WorkbookRow {
    id: string;
    primary_keyword: string;
    secondary_keyword: string | null;
    page_type: string;
    url: string | null;
    status: string;
    brief_url: string | null;
    brief_data: any | null;
    intent: string | null;
    location: string | null;
    longtail_keywords: string | null;
    created_at: string;
    updated_at: string;
    client_id: string;
    user_id: string | null;
    clients: {
        name: string;
        workbook_url: string;
    } | null;
    profiles: {
        full_name: string;
        email: string;
    } | null;
    notes: string | null;
}

export default function ContentBriefActivityLog() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();
    const [rows, setRows] = useState<WorkbookRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { userRole, isAdmin, loading: roleLoading } = useUserRole(user?.id);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [isInternalLoading, setIsInternalLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState<WorkbookRow | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Dynamic row data that updates in real-time if visible in the current list
    const activeRow = useMemo(() => {
        if (!selectedRow) return null;
        return rows.find(r => r.id === selectedRow.id) || selectedRow;
    }, [rows, selectedRow]);

    // Pusher real-time updates
    const updates = usePusherGlobalBriefUpdates();

    useEffect(() => {
        console.log('[Content Briefs] Effect triggered:', { user: !!user, userRole, roleLoading });
        if (user && userRole && !roleLoading) {
            console.log('[Content Briefs] Fetching rows...');
            fetchRows();
        } else {
            console.log('[Content Briefs] Waiting for:', {
                hasUser: !!user,
                hasRole: !!userRole,
                roleLoading
            });
        }
    }, [user, userRole, roleLoading, currentPage, pageSize, statusFilter]);

    // Handle real-time updates from Pusher
    useEffect(() => {
        if (updates.length === 0) return;

        const latestUpdate = updates[updates.length - 1];

        setRows(prevRows => {
            const index = prevRows.findIndex(r => r.id === latestUpdate.id);
            if (index !== -1) {
                // Update existing row
                const updatedRows = [...prevRows];
                updatedRows[index] = {
                    ...updatedRows[index],
                    status: latestUpdate.status,
                    brief_url: latestUpdate.brief_url || updatedRows[index].brief_url,
                    notes: latestUpdate.notes || updatedRows[index].notes,
                    secondary_keyword: latestUpdate.secondary_keyword || updatedRows[index].secondary_keyword,
                    longtail_keywords: latestUpdate.longtail_keywords || updatedRows[index].longtail_keywords,
                    updated_at: new Date().toISOString()
                };

                return updatedRows;
            }
            return prevRows;
        });
    }, [updates, toast]);

    const fetchRows = async () => {
        setIsInternalLoading(true);
        try {
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('workbook_rows')
                .select(`
                    *,
                    clients (
                        name,
                        workbook_url
                    ),
                    profiles:user_id (
                        full_name,
                        email
                    )
                `, { count: 'exact' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (userRole !== 'admin') {
                query = query.eq('user_id', user?.id);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error('Supabase error fetching activity log:', error);
                toast({
                    title: "Fetch Error",
                    description: `Status ${error.code}: ${error.message}. Check console for details.`,
                    variant: "destructive"
                });
                throw error;
            }

            setRows(data as unknown as WorkbookRow[] || []);
            setTotalCount(count || 0);
        } catch (err: any) {
            console.error('Error fetching activity log:', err);
        } finally {
            setLoading(false);
            setIsInternalLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        switch (s) {
            case 'NEW':
                return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 border-blue-200';
            case 'IN_PROGRESS':
                return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30 border-yellow-200';
            case 'DONE':
            case 'SUCCESS':
                return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 border-green-200';
            case 'ERROR':
            case 'FAILED':
                return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 border-red-200';
            default:
                return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 border-gray-200';
        }
    };

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const search = searchTerm.toLowerCase();
        return rows.filter(row =>
            row.primary_keyword.toLowerCase().includes(search) ||
            row.clients?.name.toLowerCase().includes(search) ||
            row.page_type.toLowerCase().includes(search)
        );
    }, [rows, searchTerm]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Research History
                            {userRole === 'admin' && (
                                <Badge variant="default" className="ml-3">Admin Panel</Badge>
                            )}
                        </h1>
                        <p className="text-muted-foreground">
                            {userRole === 'admin'
                                ? `Overseeing ${totalCount} research ${totalCount === 1 ? 'task' : 'tasks'} across the system`
                                : `You have ${totalCount} research ${totalCount === 1 ? 'brief' : 'briefs'} in your personal history`}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/content-briefs/generate')}
                        className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold px-6 h-12 shadow-lg shadow-brand-blue-crayola/20 transition-all hover:scale-105"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate New Brief
                    </Button>
                </div>

                <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative max-w-md w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search keywords or clients..."
                                    className="pl-10 bg-background/50 border-border/50 h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
                                    <Filter className="w-4 h-4" />
                                    Filter:
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="DONE">Completed</SelectItem>
                                        <SelectItem value="IN_PROGRESS">Processing</SelectItem>
                                        <SelectItem value="NEW">Pending</SelectItem>
                                        <SelectItem value="ERROR">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/20">
                                    <TableRow className="border-b border-border/50">
                                        <TableHead className="py-4 px-6 font-bold text-foreground">Client & Goal</TableHead>
                                        <TableHead className="py-4 px-4 font-bold text-foreground">Page Type</TableHead>
                                        <TableHead className="py-4 px-4 font-bold text-foreground">Requested By</TableHead>
                                        <TableHead className="py-4 px-4 font-bold text-foreground text-center">Status</TableHead>
                                        <TableHead className="py-4 px-4 font-bold text-foreground">Updated</TableHead>
                                        <TableHead className="py-4 px-4 font-bold text-foreground text-center">Output</TableHead>
                                        <TableHead className="py-4 px-4 font-bold text-foreground text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isInternalLoading && rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center">
                                                <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-blue-crayola mb-4" />
                                                <p className="text-muted-foreground font-medium">Fetching activity logs...</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-50">
                                                    <Search className="w-10 h-10 mb-2" />
                                                    <p className="text-lg font-bold">No results found</p>
                                                    <p className="text-sm">Try adjusting your search or filters.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredRows.map((row) => (
                                        <TableRow key={row.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors group">
                                            <TableCell className="py-5 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-brand-blue-crayola uppercase tracking-wider">
                                                        {row.clients?.name || 'Unknown Client'}
                                                    </span>
                                                    <p className="font-bold text-foreground leading-tight group-hover:text-brand-blue-crayola transition-colors">
                                                        {row.primary_keyword}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 px-4">
                                                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight">
                                                    {row.page_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-5 px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {row.profiles?.full_name || 'System (Legacy)'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground italic">
                                                        {row.profiles?.email || 'automated@skywide.com'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 px-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border shadow-sm ${getStatusColor(row.status)}`}>
                                                    {row.status === 'IN_PROGRESS' && <Clock className="w-3 h-3 mr-1.5 animate-pulse" />}
                                                    {row.status === 'DONE' && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
                                                    {row.status === 'ERROR' && <AlertCircle className="w-3 h-3 mr-1.5" />}
                                                    {row.status.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-5 px-4">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(row.updated_at || row.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 px-4 text-center">
                                                {row.brief_url ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 font-bold text-brand-blue-crayola hover:bg-brand-blue-crayola/10 gap-1.5"
                                                        onClick={() => window.open(row.brief_url!, '_blank')}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        DOC
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Pending</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-5 px-6 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        setSelectedRow(row);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="p-6 border-t border-border/50 bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-muted-foreground font-medium">
                                Showing {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} - {Math.min(totalCount, currentPage * pageSize)} of {totalCount} entries
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1 || isInternalLoading}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="h-9 px-4 font-bold border-border/50"
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    <Button variant="default" size="sm" className="h-9 w-9 p-0 bg-brand-blue-crayola">
                                        {currentPage}
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages || isInternalLoading}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="h-9 px-4 font-bold border-border/50"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 border-b bg-muted/30">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    {activeRow?.primary_keyword}
                                </DialogTitle>
                                <DialogDescription className="mt-1">
                                    Setup details for {activeRow?.clients?.name}
                                </DialogDescription>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border shadow-sm ${activeRow ? getStatusColor(activeRow.status) : ''}`}>
                                {activeRow?.status.replace('_', ' ')}
                            </span>
                        </div>
                    </DialogHeader>

                    <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 border-b bg-muted/10">
                            <TabsList className="bg-transparent h-12 gap-6 p-0">
                                <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-blue-crayola rounded-none h-full font-bold px-0">Overview</TabsTrigger>
                                <TabsTrigger value="research" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-blue-crayola rounded-none h-full font-bold px-0">Insights</TabsTrigger>
                                <TabsTrigger value="links" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-blue-crayola rounded-none h-full font-bold px-0">Links</TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <TabsContent value="info" className="mt-0 space-y-6">
                                {activeRow?.status === 'ERROR' && (
                                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-4">
                                        <div className="p-2 bg-destructive/20 rounded-full shrink-0">
                                            <AlertCircle className="w-5 h-5 text-destructive" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-destructive uppercase tracking-wider mb-1">Research Failed</h4>
                                            <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                                                {activeRow.notes || "An unknown error occurred during the research generation process. Please check the engine status or try again."}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Brief Setup</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between py-1 border-b border-border/50">
                                                    <span className="text-sm text-muted-foreground">Client</span>
                                                    <span className="text-sm font-semibold">{activeRow?.clients?.name}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-border/50">
                                                    <span className="text-sm text-muted-foreground">Page Type</span>
                                                    <span className="text-sm font-semibold capitalize">{activeRow?.page_type}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-border/50">
                                                    <span className="text-sm text-muted-foreground">Main Goal</span>
                                                    <span className="text-sm font-semibold capitalize">{activeRow?.intent || '---'}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-border/50">
                                                    <span className="text-sm text-muted-foreground">Location</span>
                                                    <span className="text-sm font-semibold">{activeRow?.location || 'Global'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Source Page</h4>
                                            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 break-all">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <ExternalLink className="w-3 h-3 text-brand-blue-crayola" />
                                                    <span className="text-xs font-bold text-brand-blue-crayola uppercase tracking-tighter">Target Destination</span>
                                                </div>
                                                <a href={activeRow?.url || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                                                    {activeRow?.url || 'No URL specified'}
                                                </a>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Keywords</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Primary</p>
                                                    <p className="text-sm font-bold">{activeRow?.primary_keyword}</p>
                                                </div>
                                                {activeRow?.secondary_keyword && (
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Secondary</p>
                                                        <p className="text-xs font-semibold">{activeRow.secondary_keyword}</p>
                                                    </div>
                                                )}
                                                {activeRow?.longtail_keywords && (
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Longtail / Semantics</p>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{activeRow.longtail_keywords}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Request Info</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/50">
                                            <div className="p-2 bg-brand-blue-crayola/10 rounded-full">
                                                <Sparkles className="w-4 h-4 text-brand-blue-crayola" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Owner</p>
                                                <p className="text-sm font-bold">{activeRow?.profiles?.full_name || 'System (Legacy)'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/50">
                                            <div className="p-2 bg-brand-blue-crayola/10 rounded-full">
                                                <Clock className="w-4 h-4 text-brand-blue-crayola" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Last Activity</p>
                                                <p className="text-sm font-bold">{activeRow ? formatDate(activeRow.updated_at || activeRow.created_at) : '---'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="research" className="mt-0 space-y-6">
                                {activeRow?.brief_data ? (
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">SEO Summary</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-brand-blue-crayola/5 rounded-xl border border-brand-blue-crayola/10">
                                                    <p className="text-xs font-bold text-brand-blue-crayola uppercase mb-2">Opportunities</p>
                                                    <p className="text-sm leading-relaxed">{activeRow.brief_data.serp_analysis?.competitive_gaps || 'No competitive gaps identified.'}</p>
                                                </div>
                                                <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                                                    <p className="text-xs font-bold text-purple-500 uppercase mb-2">Writing Patterns</p>
                                                    <p className="text-sm leading-relaxed">{activeRow.brief_data.serp_analysis?.pattern_analysis || 'No specific patterns analyzed.'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Voice & Tone</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Tone</p>
                                                    <p className="text-sm font-bold">{activeRow.brief_data.style_guidelines?.tone || 'Professional'}</p>
                                                </div>
                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Reading Level</p>
                                                    <p className="text-sm font-bold">{activeRow.brief_data.style_guidelines?.reading_level || 'Grade 10-12'}</p>
                                                </div>
                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Format Guidance</p>
                                                    <p className="text-sm font-bold">{activeRow.brief_data.serp_analysis?.content_format_analysis?.rationale.substring(0, 30)}...</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                        <AlertCircle className="w-12 h-12 mb-4" />
                                        <p className="text-lg font-bold">No Research Data Available</p>
                                        <p className="text-sm text-center max-w-xs">Detailed research data is only available for briefs generated after the recent engine update.</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="links" className="mt-0 space-y-6">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-brand-blue-crayola rounded-full"></div>
                                            Linked Content
                                        </h4>
                                        <div className="space-y-2">
                                            {activeRow?.brief_data?.internal_links?.length > 0 ? (
                                                activeRow?.brief_data.internal_links.map((link: any, idx: number) => (
                                                    <div key={idx} className="p-3 bg-muted/10 rounded-lg border border-border/50 flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-brand-blue-crayola">Anchor: "{link.anchor}"</span>
                                                            <Badge variant="outline" className="text-[9px] uppercase">{link.url_status === '200' ? 'Verified' : 'Suggested'}</Badge>
                                                        </div>
                                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline truncate">{link.url}</a>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic p-4 bg-muted/10 rounded-lg border border-dashed text-center">No internal links recommended for this content piece.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            Reference Sources
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            {activeRow?.brief_data?.external_links?.length > 0 ? (
                                                activeRow?.brief_data.external_links.map((link: any, idx: number) => (
                                                    <div key={idx} className="p-3 bg-muted/10 rounded-lg border border-border/50 flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold">Source: {link.anchor}</span>
                                                            <span className="px-1.5 py-0.5 bg-muted rounded text-[9px] uppercase font-bold">{link.domain_authority || 'High'} DA</span>
                                                        </div>
                                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline truncate">{link.url}</a>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic p-4 bg-muted/10 rounded-lg border border-dashed text-center">No external sources recommended for this content piece.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>

                    <DialogHeader className="p-4 border-t bg-muted/50 flex flex-row justify-end items-center gap-3">
                        <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="font-bold">Close</Button>
                        {activeRow?.brief_url && (
                            <Button
                                onClick={() => window.open(activeRow.brief_url!, '_blank')}
                                className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Google Doc
                            </Button>
                        )}
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
}
