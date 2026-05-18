"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Loader2, Trash2, MapPin } from 'lucide-react';
import { AddTopicsModal } from '@/components/gbp/AddTopicsModal';
import { useToast } from '@/hooks/use-toast';

export function TopicsTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
    const [isGenerating, setIsGenerating] = useState(false);

    // Active clients
    const { data: clients = [] } = useQuery({
        queryKey: ['gbp_clients_active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gbp_clients')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    // Locations for the selected client
    const { data: locations = [] } = useQuery({
        queryKey: ['gbp_locations_active', selectedClientId],
        queryFn: async () => {
            if (!selectedClientId) return [];
            const { data, error } = await supabase
                .from('gbp_locations')
                .select('id, location_name, sheet_tab_name')
                .eq('gbp_client_id', selectedClientId)
                .eq('is_active', true)
                .order('location_name');
            if (error) throw error;
            return data;
        },
        enabled: !!selectedClientId,
    });

    const isMultiLocation = locations.length > 1;

    const handleClientChange = (val: string) => {
        setSelectedClientId(val);
        setSelectedLocationId('all'); // reset location when client changes
    };

    const handleGenerate = async () => {
        if (!selectedClientId) {
            toast({ title: "Select a client", description: "Please select a client first.", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        try {
            const payload: Record<string, string> = { client_id: selectedClientId };

            // Pass location_id so trigger knows which tabs to fire
            if (isMultiLocation) {
                payload.location_id = selectedLocationId; // 'all' or a specific UUID
            }

            const res = await fetch('/api/gbp/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to trigger generation');

            const locationLabel = selectedLocationId === 'all'
                ? `all ${data.fired} location${data.fired !== 1 ? 's' : ''}`
                : locations.find((l: any) => l.id === selectedLocationId)?.location_name || 'selected location';

            toast({
                title: "Generation Started",
                description: `n8n triggered for ${locationLabel}. Posts will appear in the Post Review tab as they complete.`,
            });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            'NEW': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'IN_PROGRESS': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            'DONE': 'bg-green-500/10 text-green-500 border-green-500/20',
        }[status] || 'bg-muted/10 text-muted-foreground border-muted/20';
        return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors}`}>{status.replace('_', ' ')}</span>;
    };

    return (
        <div className="space-y-4 mt-6">
            {/* Controls row */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Client selector */}
                    <Select value={selectedClientId} onValueChange={handleClientChange}>
                        <SelectTrigger className="w-[220px] bg-background border-border/50">
                            <SelectValue placeholder="Select Client..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Location selector — only appears when client has multiple locations */}
                    {isMultiLocation && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand-blue-crayola shrink-0" />
                            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                                <SelectTrigger className="w-[200px] bg-background border-border/50">
                                    <SelectValue placeholder="All Locations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map((l: any) => (
                                        <SelectItem key={l.id} value={l.id}>
                                            {l.location_name}
                                            {l.sheet_tab_name && (
                                                <span className="ml-1.5 text-muted-foreground text-[10px]">({l.sheet_tab_name})</span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">
                                {selectedLocationId === 'all'
                                    ? `${locations.length} locations`
                                    : '1 location'
                                }
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <AddTopicsModal
                        clients={clients}
                        defaultClientId={selectedClientId || undefined}
                        onTopicsAdded={() => queryClient.invalidateQueries({ queryKey: ['gbp_topics'] })}
                    />
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !selectedClientId}
                        className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold shadow-lg shadow-brand-blue-crayola/20"
                    >
                        {isGenerating
                            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            : <Zap className="w-4 h-4 mr-2" />
                        }
                        {isGenerating
                            ? 'Triggering...'
                            : isMultiLocation && selectedLocationId === 'all'
                                ? `Generate for All ${locations.length} Locations`
                                : 'Generate Posts'
                        }
                    </Button>
                </div>
            </div>

            {/* Info banner for multi-location */}
            {isMultiLocation && selectedLocationId === 'all' && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-brand-blue-crayola/5 border border-brand-blue-crayola/20 rounded-lg text-xs text-brand-blue-crayola">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    This will trigger <strong>{locations.length} separate n8n runs</strong> — one per location. Topics with a Generated Date in each tab will be skipped automatically.
                </div>
            )}
        </div>
    );
}
