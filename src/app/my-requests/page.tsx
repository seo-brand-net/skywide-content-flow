"use client";

import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useContentRequests, ContentRequest } from '@/hooks/useContentRequests';
import { useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Eye, Clock, User, ExternalLink, Search, Loader2, AlertCircle, RefreshCw, PenLine } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';


export default function MyRequests() {
    const { user } = useAuth();
    const { userRole, loading: roleLoading, authError, isInitialLoading } = useUserRole(user?.id);
    const queryClient = useQueryClient();

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedRequest, setSelectedRequest] = useState<ContentRequest | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Retry / Revision state
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryToast, setRetryToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [revisionNotes, setRevisionNotes] = useState('');
    const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
    const [revisionToast, setRevisionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // React Query for data fetching
    const {
        data: queryData,
        isLoading: isQueryLoading,
        error: queryError,
        isPlaceholderData
    } = useContentRequests({
        currentPage,
        pageSize,
        userRole,
        userId: user?.id,
        enabled: !!user?.id
    });

    const requests = queryData?.requests || [];
    const totalCount = queryData?.totalCount || 0;

    // Improved loading logic: Only block everything if we have NO user session.
    // Otherwise, let the data query handle the skeletons.
    const isAuthResolving = !user && (roleLoading || isInitialLoading);
    const loading = isAuthResolving || (isQueryLoading && !isPlaceholderData);
    const isInternalLoading = isQueryLoading || isPlaceholderData;
    const error = queryError ? (queryError as any).message : null;



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'pending':
                return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
            case 'in_progress':
                return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
            case 'complete':
            case 'completed':
                return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
            case 'failed':
            case 'error':
            case 'cancelled':
                return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
            default:
                return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
        }
    };

    const getDisplayStatus = (request: typeof requests[0]) => {
        if (request.status === 'cancelled' && request.error_message) return 'error';
        if (request.status === 'completed') return 'complete';
        return request.status.replace('_', ' ');
    };

    const getDisplayColor = (request: typeof requests[0]) => {
        if (request.status === 'cancelled' && request.error_message) return getStatusColor('error');
        return getStatusColor(request.status);
    };

    const openDetailView = (request: ContentRequest) => {
        setSelectedRequest(request);
        setIsDetailModalOpen(true);
        setRetryToast(null);
        setRevisionToast(null);
    };

    const handleRetry = async () => {
        if (!selectedRequest) return;
        setIsRetrying(true);
        setRetryToast(null);
        try {
            const res = await fetch(`/api/content-requests/retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: selectedRequest.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setRetryToast({ type: 'error', message: data.error || 'Retry failed.' });
            } else {
                setRetryToast({ type: 'success', message: 'Execution retried successfully. Status will update shortly.' });
                queryClient.invalidateQueries({ queryKey: ['content_requests'] });
            }
        } catch (e) {
            setRetryToast({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setIsRetrying(false);
        }
    };

    const handleRevisionSubmit = async () => {
        if (!selectedRequest) return;
        setIsSubmittingRevision(true);
        setRevisionToast(null);
        try {
            const res = await fetch(`/api/content-requests/revise`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: selectedRequest.id, revisionNotes }),
            });
            const data = await res.json();
            if (!res.ok) {
                setRevisionToast({ type: 'error', message: data.error || 'Revision request failed.' });
            } else {
                setRevisionToast({ type: 'success', message: 'Revision started! The workflow is running again.' });
                setIsRevisionModalOpen(false);
                setRevisionNotes('');
                queryClient.invalidateQueries({ queryKey: ['content_requests'] });
            }
        } catch (e) {
            setRevisionToast({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setIsSubmittingRevision(false);
        }
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    const getGoogleDriveLink = (webhookResponse: string | null): string | null => {
        if (!webhookResponse) return null;

        try {
            const parsed = JSON.parse(webhookResponse);
            return parsed.gDriveLink || null;
        } catch {
            // If it's not JSON, check if it's a direct URL
            if (webhookResponse.includes('drive.google.com')) {
                return webhookResponse;
            }
            return null;
        }
    };

    // For client-side search, we search only within the current page
    // In a real high-volume app, you'd want server-side search
    const filteredRequests = useMemo(() => {
        if (!searchTerm.trim()) return requests;

        const search = searchTerm.toLowerCase();
        return requests.filter(request =>
            request.article_title.toLowerCase().includes(search) ||
            request.client_name.toLowerCase().includes(search) ||
            request.article_type.toLowerCase().includes(search) ||
            request.status.toLowerCase().includes(search) ||
            request.creative_brief.toLowerCase().includes(search) ||
            (userRole === 'admin' && request.profiles?.full_name?.toLowerCase().includes(search)) ||
            (userRole === 'admin' && request.profiles?.email?.toLowerCase().includes(search))
        );
    }, [requests, searchTerm, userRole]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-2">My Requests</h1>
                        <p className="text-muted-foreground">Loading your submitted content requests...</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Skeleton className="h-6 w-3/4 mb-2" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Skeleton className="h-5 w-16" />
                                            <Skeleton className="h-5 w-20" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                        <div className="pt-2 border-t border-border">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-3 w-20" />
                                                <Skeleton className="h-6 w-6" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto space-y-6 py-20 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-foreground">Query Error</h1>
                    <p className="text-red-500">{error?.message || String(error)}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="mt-6"
                    >
                        Force Refresh
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        {authError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{authError}</p>
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            My Requests
                            {userRole === 'admin' && (
                                <Badge variant="default" className="ml-3">Admin</Badge>
                            )}
                        </h1>
                        <p className="text-muted-foreground">
                            {userRole === 'admin'
                                ? `Managing ${totalCount} content ${totalCount === 1 ? 'request' : 'requests'} across the system`
                                : `You have ${totalCount} content ${totalCount === 1 ? 'request' : 'requests'} in your history`}
                        </p>
                    </div>
                </div>

                {/* Search functionality */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search requests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    {searchTerm && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Found {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''} for "{searchTerm}"
                        </p>
                    )}
                </div>

                {filteredRequests.length === 0 && requests.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <p className="text-lg text-muted-foreground mb-4">
                                No requests submitted yet.
                            </p>
                            <Button asChild>
                                <Link href="/dashboard">Submit your first request</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : filteredRequests.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <p className="text-lg text-muted-foreground mb-4">
                                No requests found matching "{searchTerm}".
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setSearchTerm('')}
                            >
                                Clear search
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="border-border/50 shadow-md hover-glow transition-all duration-300">
                            <CardHeader className="bg-muted/50 border-b border-border/50">
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-brand-blue-crayola" />
                                    Recent Content Requests
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="relative">
                                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                            <TableRow className="border-b border-border/50">
                                                <TableHead className="font-bold text-foreground py-4 px-6 w-[25%] min-w-[200px]">Article Title</TableHead>
                                                {userRole === 'admin' && <TableHead className="font-bold text-foreground py-4 px-4 min-w-[150px]">User</TableHead>}
                                                <TableHead className="font-bold text-foreground py-4 px-4 min-w-[120px]">Client</TableHead>
                                                <TableHead className="font-bold text-foreground py-4 px-4 min-w-[100px]">Type</TableHead>
                                                <TableHead className="font-bold text-foreground py-4 px-4 min-w-[120px]">Status</TableHead>
                                                <TableHead className="font-bold text-foreground py-4 px-4 min-w-[160px]">Submitted</TableHead>
                                                <TableHead className="font-bold text-foreground py-4 px-4 text-center min-w-[120px]">View Docs</TableHead>
                                                <TableHead className="font-bold text-foreground py-4 px-4 text-center min-w-[100px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isInternalLoading && requests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={userRole === 'admin' ? 8 : 7} className="h-48 text-center">
                                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-blue-crayola mb-2" />
                                                        <p className="text-muted-foreground">Fetching requests...</p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredRequests.map((request) => {
                                                const googleDriveLink = getGoogleDriveLink(request.webhook_response);

                                                return (
                                                    <TableRow key={request.id} className="border-b border-border/40 hover:bg-muted/60 transition-colors group">
                                                        <TableCell className="py-5 px-6">
                                                            <div className="flex flex-col gap-1">
                                                                <p className="font-semibold text-foreground leading-tight group-hover:text-brand-blue-crayola transition-colors" title={request.article_title}>
                                                                    {request.article_title}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                                                    {request.id.substring(0, 8)}...
                                                                </p>
                                                            </div>
                                                        </TableCell>

                                                        {userRole === 'admin' && (
                                                            <TableCell className="py-5 px-4 font-medium">
                                                                {request.profiles ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm text-foreground">{request.profiles.full_name}</span>
                                                                        <span className="text-xs text-muted-foreground">{request.profiles.email}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground italic text-sm">System</span>
                                                                )}
                                                            </TableCell>
                                                        )}

                                                        <TableCell className="py-5 px-4">
                                                            <span className="text-sm text-foreground font-semibold px-2 py-1 bg-muted rounded-md border border-border/50">
                                                                {request.client_name}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell className="py-5 px-4 text-center">
                                                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold">
                                                                {request.article_type}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell className="py-5 px-4">
                                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tight shadow-sm border ${getDisplayColor(request)}`}>
                                                                {getDisplayStatus(request)}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell className="py-5 px-4">
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                                <Clock className="w-3 h-3" />
                                                                {formatDate(request.created_at)}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="py-5 px-4 text-center">
                                                            {googleDriveLink && (request.status === 'complete' || request.status === 'completed') ? (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(googleDriveLink, '_blank');
                                                                    }}
                                                                    className="text-xs font-bold bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 transition-all hover:scale-105 shadow-md"
                                                                >
                                                                    <ExternalLink className="h-3 w-3 mr-1.5" />
                                                                    View Docs
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled
                                                                    className="text-xs font-bold bg-muted/60 text-muted-foreground border-none cursor-not-allowed opacity-50 select-none"
                                                                >
                                                                    <Clock className="h-3 w-3 mr-1.5" />
                                                                    {request.status.toUpperCase()}
                                                                </Button>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="py-5 px-4 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openDetailView(request)}
                                                                className="text-xs font-bold hover:bg-brand-blue-crayola/10 hover:text-brand-blue-crayola transition-all"
                                                            >
                                                                <Eye className="h-3 w-3 mr-1.5" />
                                                                Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Enhanced Pagination Controls */}
                                <div className="p-4 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground font-medium">Page Size:</span>
                                        <Select
                                            value={pageSize.toString()}
                                            onValueChange={(val: string) => {
                                                setPageSize(parseInt(val));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-20 text-xs font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm text-muted-foreground ml-2">
                                            Showing {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} - {Math.min(totalCount, currentPage * pageSize)} of {totalCount}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage === 1 || isInternalLoading}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="h-8 px-3 font-bold"
                                        >
                                            Prev
                                        </Button>

                                        <div className="flex items-center gap-1">
                                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;

                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "ghost"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`h-8 w-8 p-0 font-bold ${currentPage === pageNum ? 'bg-brand-blue-crayola' : ''}`}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage === totalPages || isInternalLoading}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className="h-8 px-3 font-bold"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detail Modal */}
                        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Request Details</DialogTitle>
                                </DialogHeader>

                                {selectedRequest && (
                                    <div className="space-y-6">
                                        {/* Status Header Block */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
                                            <div>
                                                <h3 className="text-lg font-semibold text-foreground">{selectedRequest.article_title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">Request ID: {selectedRequest.id}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${getDisplayColor(selectedRequest)}`}>
                                                    {getDisplayStatus(selectedRequest)}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Updated: {formatDate(selectedRequest.updated_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Error Alert (Prominent) + Retry */}
                                        {getDisplayStatus(selectedRequest) === 'error' && selectedRequest.error_message && (
                                            <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-r-md p-4 shadow-sm">
                                                <div className="flex items-start">
                                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-red-800 dark:text-red-300">Processing Error</h4>
                                                        <div className="mt-2 text-sm text-red-700 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20 p-3 rounded font-mono whitespace-pre-wrap break-words border border-red-200 dark:border-red-800/50">
                                                            {selectedRequest.error_message}
                                                        </div>
                                                        <p className="mt-2 text-xs text-red-600 dark:text-red-500 font-medium">
                                                            This request encountered an error during workflow execution and has been halted.
                                                        </p>
                                                        {/* Retry button — admin only */}
                                                        {userRole === 'admin' && (
                                                            <div className="mt-3 flex flex-col gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={handleRetry}
                                                                    disabled={isRetrying}
                                                                    className="w-fit border-red-400 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold"
                                                                >
                                                                    {isRetrying ? (
                                                                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Retrying...</>
                                                                    ) : (
                                                                        <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry Failed Execution</>  
                                                                    )}
                                                                </Button>
                                                                {retryToast && (
                                                                    <p className={`text-xs font-medium ${retryToast.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                        {retryToast.message}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* User Info (Admin Only) */}
                                        {userRole === 'admin' && selectedRequest.profiles && (
                                            <div className="flex items-center gap-3 bg-brand-blue-crayola/5 border border-brand-blue-crayola/20 p-3 rounded-lg">
                                                <div className="h-8 w-8 rounded-full bg-brand-blue-crayola/20 flex items-center justify-center text-brand-blue-crayola font-bold">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{selectedRequest.profiles.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{selectedRequest.profiles.email}</p>
                                                </div>
                                                <Badge
                                                    variant={selectedRequest.profiles.role === 'admin' ? 'default' : 'secondary'}
                                                    className="ml-auto text-[10px] uppercase"
                                                >
                                                    {selectedRequest.profiles.role}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Core Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Name</label>
                                                    <p className="text-sm font-medium text-foreground mt-1 bg-muted/40 p-2 rounded border border-border/50">
                                                        {selectedRequest.client_name || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Audience</label>
                                                    <p className="text-sm text-foreground mt-1">{selectedRequest.title_audience || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Article Type</label>
                                                    <p className="text-sm text-foreground mt-1">{selectedRequest.article_type || 'N/A'}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SEO Keywords</label>
                                                    <p className="text-sm text-foreground mt-1">{selectedRequest.seo_keywords || 'None provided'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted On</label>
                                                    <p className="text-sm text-foreground mt-1 flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {formatDate(selectedRequest.created_at)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Webhook Dispatch</label>
                                                    <p className="text-sm text-foreground mt-1 flex items-center gap-1.5">
                                                        <span className={`w-2 h-2 rounded-full ${selectedRequest.webhook_sent ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        {selectedRequest.webhook_sent ? 'Successfully dispatched to workflow' : 'Pending dispatch'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Creative Brief */}
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Creative Brief</label>
                                            <div className="bg-muted/20 border border-border/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap max-h-60 overflow-y-auto font-serif leading-relaxed">
                                                {selectedRequest.creative_brief || <span className="text-muted-foreground italic">No brief provided.</span>}
                                            </div>
                                        </div>

                                        {/* Google Drive Documents Section */}
                                        <div className="pt-4 border-t border-border/50">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Exported Documents</label>
                                            {getGoogleDriveLink(selectedRequest.webhook_response) ? (
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <Button
                                                        variant="default"
                                                        onClick={() => {
                                                            const link = getGoogleDriveLink(selectedRequest.webhook_response);
                                                            if (link) window.open(link, '_blank');
                                                        }}
                                                        className="w-full sm:w-auto font-bold bg-[#1ca350] hover:bg-[#15823f] text-white shadow-md transition-all hover:-translate-y-0.5"
                                                    >
                                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 87.3 122.8" fill="currentColor">
                                                            <path d="M54.1,28V0H6.2C2.8,0,0,2.8,0,6.2v110.4C0,120,2.8,122.8,6.2,122.8h74.9c3.4,0,6.2-2.8,6.2-6.2V33.2H59.3C56.4,33.2,54.1,30.9,54.1,28L54.1,28z" fill="#00A96B"/>
                                                            <path d="M59.3,33.2h28L54.1,0v28C54.1,30.9,56.4,33.2,59.3,33.2L59.3,33.2z" fill="#008051"/>
                                                        </svg>
                                                        Open Google Drive Folder
                                                    </Button>
                                                    {/* Request Revision button */}
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => { setRevisionToast(null); setIsRevisionModalOpen(true); }}
                                                        className="w-full sm:w-auto font-bold border-brand-blue-crayola/50 text-brand-blue-crayola hover:bg-brand-blue-crayola/10 transition-all"
                                                    >
                                                        <PenLine className="w-4 h-4 mr-2" />
                                                        Request Revision
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center p-6 bg-muted/30 border border-border/50 border-dashed rounded-lg">
                                                    <div className="text-center space-y-2">
                                                        {getDisplayStatus(selectedRequest) === 'error' ? (
                                                            <>
                                                                <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                                                                <p className="text-sm font-medium text-muted-foreground">Generation halted</p>
                                                                <p className="text-xs text-muted-foreground">Documents were not exported due to an error.</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Loader2 className="w-8 h-8 text-brand-blue-crayola animate-spin mx-auto opacity-50" />
                                                                <p className="text-sm font-medium text-foreground">Awaiting documents...</p>
                                                                <p className="text-xs text-muted-foreground">The Google Drive folder link will appear here once the workflow finishes.</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Revision feedback toast */}
                                            {revisionToast && (
                                                <p className={`mt-3 text-xs font-medium ${revisionToast.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {revisionToast.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Revision Notes Dialog */}
                        <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen}>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <PenLine className="w-5 h-5 text-brand-blue-crayola" />
                                        Request Revision
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <p className="text-sm text-muted-foreground">
                                        Describe what you'd like changed or improved. The workflow will re-run with these notes included.
                                    </p>
                                    <Textarea
                                        placeholder="e.g. Make the tone more conversational, expand the conclusion, add more examples..."
                                        value={revisionNotes}
                                        onChange={(e) => setRevisionNotes(e.target.value)}
                                        rows={5}
                                        className="resize-none text-sm"
                                    />
                                    {revisionToast && (
                                        <p className={`text-xs font-medium ${revisionToast.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {revisionToast.message}
                                        </p>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsRevisionModalOpen(false)}
                                        disabled={isSubmittingRevision}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleRevisionSubmit}
                                        disabled={isSubmittingRevision}
                                        className="font-bold bg-brand-blue-crayola hover:bg-brand-blue-crayola/90"
                                    >
                                        {isSubmittingRevision ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                                        ) : (
                                            <>Submit Revision Request</>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
        </div>
    );
}
