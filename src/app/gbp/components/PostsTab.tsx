"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink, Image as ImageIcon, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function PostsTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [selectedClientId, setSelectedClientId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    const { data: clients = [] } = useQuery({
        queryKey: ['gbp_clients_active'],
        queryFn: async () => {
            const { data, error } = await supabase.from('gbp_clients').select('id, name').eq('is_active', true);
            if (error) throw error;
            return data;
        }
    });

    const { data: posts = [], isLoading } = useQuery({
        queryKey: ['gbp_posts', selectedClientId, statusFilter],
        queryFn: async () => {
            let query = supabase.from('gbp_posts').select(`
                *,
                gbp_clients(name),
                gbp_locations(location_name)
            `).order('created_at', { ascending: false });
            
            if (selectedClientId !== 'all') query = query.eq('gbp_client_id', selectedClientId);
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        refetchInterval: 30000 // Poll every 30s
    });

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const updateData: any = { status: newStatus };
        if (newStatus === 'APPROVED' && user) updateData.reviewed_by = user.id;

        const { error } = await supabase.from('gbp_posts').update(updateData).eq('id', id);
        
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Status Updated", description: `Post marked as ${newStatus}.` });
            queryClient.invalidateQueries({ queryKey: ['gbp_posts'] });
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            'DRAFT': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'APPROVED': 'bg-green-500/10 text-green-500 border-green-500/20',
            'PUBLISHED': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        }[status] || 'bg-muted/10 text-muted-foreground border-muted/20';

        return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors}`}>{status}</span>;
    };

    return (
        <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden mt-6">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger className="w-[250px] bg-background/50 border-border/50">
                            <SelectValue placeholder="All Clients" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="PUBLISHED">Published</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-blue-crayola" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <p>No posts found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-muted/20 border-b border-border/50">
                                    <th className="px-6 py-4 font-bold text-foreground">Topic</th>
                                    <th className="px-4 py-4 font-bold text-foreground">Client</th>
                                    <th className="px-4 py-4 font-bold text-foreground">Status</th>
                                    <th className="px-4 py-4 font-bold text-foreground">Date</th>
                                    <th className="px-4 py-4 font-bold text-foreground text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {posts.map((post: any) => (
                                    <React.Fragment key={post.id}>
                                        <tr className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-foreground truncate max-w-[300px]">{post.post_topic}</td>
                                            <td className="px-4 py-4 text-muted-foreground text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{post.gbp_clients?.name}</span>
                                                    <span>{post.gbp_locations?.location_name || 'General'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4"><StatusBadge status={post.status} /></td>
                                            <td className="px-4 py-4 text-muted-foreground text-xs">
                                                {new Date(post.generated_at || post.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {post.status === 'DRAFT' && (
                                                        <>
                                                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(post.id, 'APPROVED')} className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10" title="Approve">
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(post.id, 'DRAFT')} className="h-8 w-8 p-0 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10" title="Request Changes">
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}>
                                                        {expandedPostId === post.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedPostId === post.id && (
                                            <tr className="bg-muted/10">
                                                <td colSpan={5} className="px-8 py-6">
                                                    <div className="space-y-4 max-w-4xl">
                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                            <div className="lg:col-span-2 space-y-4">
                                                                <div>
                                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Post Content</h4>
                                                                    <p className="text-sm whitespace-pre-wrap bg-background p-4 rounded-lg border border-border/50">{post.post_body || 'Generating...'}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Image Prompt</h4>
                                                                        <p className="text-xs text-muted-foreground bg-background p-3 rounded-lg border border-border/50">{post.image_prompt || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Target Link</h4>
                                                                        {post.link_url ? (
                                                                            <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue-crayola hover:underline flex items-center gap-1 bg-brand-blue-crayola/5 p-3 rounded-lg border border-brand-blue-crayola/20 break-all">
                                                                                {post.link_url}
                                                                            </a>
                                                                        ) : (
                                                                            <p className="text-xs text-muted-foreground">N/A</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="lg:col-span-1 border border-border/50 rounded-lg overflow-hidden bg-muted/20 flex flex-col items-center justify-center min-h-[200px]">
                                                                {post.image_url ? (
                                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                                    <img src={post.image_url} alt="Generated post image" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground/50 p-4 text-center">
                                                                        <ImageIcon className="w-10 h-10" />
                                                                        <span className="text-xs">No image generated</span>
                                                                    </div>
                                                                )}
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
    );
}
