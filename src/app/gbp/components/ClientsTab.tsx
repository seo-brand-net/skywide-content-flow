"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Building2, Globe, ToggleLeft, ToggleRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { AddGbpClientModal } from '@/components/gbp/AddGbpClientModal';
import { LocationsPanel } from '@/components/gbp/LocationsPanel';
import { useToast } from '@/hooks/use-toast';

export function ClientsTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['gbp_clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gbp_clients')
                .select(`
                    *,
                    gbp_locations (id, is_active)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const handleToggleActive = async (client: any) => {
        const { error } = await supabase
            .from('gbp_clients')
            .update({ is_active: !client.is_active })
            .eq('id', client.id);
        
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            queryClient.invalidateQueries({ queryKey: ['gbp_clients'] });
        }
    };

    const filteredClients = clients.filter((c: any) => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalClients = clients.length;
    const activeClients = clients.filter((c: any) => c.is_active).length;
    const totalLocations = clients.reduce((acc: number, c: any) => acc + (c.gbp_locations?.length || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Clients</CardTitle>
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClients}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Clients</CardTitle>
                        <ToggleRight className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeClients}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Locations</CardTitle>
                        <MapPin className="w-4 h-4 text-brand-blue-crayola" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLocations}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
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
                        <AddGbpClientModal onClientAdded={() => queryClient.invalidateQueries({ queryKey: ['gbp_clients'] })} />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-blue-crayola" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <p>No clients found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-muted/20 border-b border-border/50">
                                        <th className="px-6 py-4 font-bold text-foreground">Client Name</th>
                                        <th className="px-4 py-4 font-bold text-foreground">Industry</th>
                                        <th className="px-4 py-4 font-bold text-foreground">Sitemap URL</th>
                                        <th className="px-4 py-4 font-bold text-foreground text-center">Locations</th>
                                        <th className="px-4 py-4 font-bold text-foreground text-center">Status</th>
                                        <th className="px-4 py-4 font-bold text-foreground text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {filteredClients.map((client: any) => (
                                        <React.Fragment key={client.id}>
                                            <tr className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-4 font-semibold text-foreground">{client.name}</td>
                                                <td className="px-4 py-4 text-muted-foreground">{client.industry}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Globe className="w-3.5 h-3.5" />
                                                        <span className="truncate max-w-[200px]" title={client.sitemap_url}>{client.sitemap_url}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center bg-brand-blue-crayola/10 text-brand-blue-crayola font-bold px-2.5 py-0.5 rounded-full text-xs">
                                                        {client.gbp_locations?.length || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button onClick={() => handleToggleActive(client)} className={`transition-colors ${client.is_active ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}>
                                                        {client.is_active ? <ToggleRight className="w-5 h-5 mx-auto" /> : <ToggleLeft className="w-5 h-5 mx-auto" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <Button variant="ghost" size="sm" onClick={() => setExpandedClientId(expandedClientId === client.id ? null : client.id)}>
                                                        {expandedClientId === client.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                </td>
                                            </tr>
                                            {expandedClientId === client.id && (
                                                <tr className="bg-muted/10">
                                                    <td colSpan={6} className="px-8 py-4">
                                                        <LocationsPanel clientId={client.id} clientName={client.name} />
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
    );
}
