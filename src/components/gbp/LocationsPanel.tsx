"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, PlusCircle, Trash2, Loader2, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface GbpLocation {
    id: string;
    gbp_client_id: string;
    location_name: string;
    city: string;
    state: string;
    sheet_tab_name: string | null;
    is_active: boolean;
    created_at: string;
}

interface LocationsPanelProps {
    clientId: string;
    clientName: string;
}

export function LocationsPanel({ clientId, clientName }: LocationsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [newLocation, setNewLocation] = useState({
        location_name: '',
        city: '',
        state: '',
        sheet_tab_name: '',
    });

    const { data: locations = [], isLoading } = useQuery({
        queryKey: ['gbp_locations', clientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gbp_locations')
                .select('*')
                .eq('gbp_client_id', clientId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data as GbpLocation[];
        },
        enabled: isOpen,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['gbp_locations', clientId] });

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocation.location_name || !newLocation.city || !newLocation.state) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('gbp_locations').insert([{
                gbp_client_id: clientId,
                location_name: newLocation.location_name,
                city: newLocation.city,
                state: newLocation.state,
                sheet_tab_name: newLocation.sheet_tab_name || null,
            }]);
            if (error) throw error;
            toast({ title: "Location Added", description: `${newLocation.location_name} added.` });
            setNewLocation({ location_name: '', city: '', state: '', sheet_tab_name: '' });
            setIsAdding(false);
            invalidate();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (loc: GbpLocation) => {
        const { error } = await supabase
            .from('gbp_locations')
            .update({ is_active: !loc.is_active })
            .eq('id', loc.id);
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            invalidate();
        }
    };

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const handleDelete = async (loc: GbpLocation) => {
        setDeletingId(loc.id);
        const { error } = await supabase.from('gbp_locations').delete().eq('id', loc.id);
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Location Removed", description: `${loc.location_name} deleted.` });
            invalidate();
        }
        setDeletingId(null);
    };

    return (
        <div className="border border-border/40 rounded-xl overflow-hidden">
            {/* Toggle header */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium"
            >
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>Locations</span>
                    {locations.length > 0 && (
                        <span className="bg-brand-blue-crayola/10 text-brand-blue-crayola text-xs font-bold px-2 py-0.5 rounded-full">
                            {locations.length}
                        </span>
                    )}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isOpen && (
                <div className="px-4 py-4 space-y-3 bg-background/50">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading locations...
                        </div>
                    ) : locations.length === 0 && !isAdding ? (
                        <p className="text-xs text-muted-foreground italic py-1">
                            No locations yet. Add one below.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {locations.map(loc => (
                                <div
                                    key={loc.id}
                                    className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg border border-border/30"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold text-foreground">
                                            {loc.location_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {loc.city}, {loc.state}
                                            {loc.sheet_tab_name && (
                                                <span className="ml-2 font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                                    tab: {loc.sheet_tab_name}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(loc)}
                                            className={`transition-colors ${loc.is_active ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                                            title={loc.is_active ? 'Active — click to pause' : 'Paused — click to activate'}
                                        >
                                            {loc.is_active
                                                ? <ToggleRight className="w-5 h-5" />
                                                : <ToggleLeft className="w-5 h-5" />
                                            }
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(loc)}
                                            disabled={deletingId === loc.id}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                            title="Delete location"
                                        >
                                            {deletingId === loc.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add location form */}
                    {isAdding ? (
                        <form onSubmit={handleAddLocation} className="space-y-3 pt-2 border-t border-border/40">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Location Name *</Label>
                                    <Input
                                        value={newLocation.location_name}
                                        onChange={e => setNewLocation({ ...newLocation, location_name: e.target.value })}
                                        placeholder="e.g. Tampa"
                                        className="h-8 text-xs bg-background"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">City *</Label>
                                    <Input
                                        value={newLocation.city}
                                        onChange={e => setNewLocation({ ...newLocation, city: e.target.value })}
                                        placeholder="Tampa"
                                        className="h-8 text-xs bg-background"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">State *</Label>
                                    <Input
                                        value={newLocation.state}
                                        onChange={e => setNewLocation({ ...newLocation, state: e.target.value })}
                                        placeholder="FL"
                                        className="h-8 text-xs bg-background"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Sheet Tab Name</Label>
                                    <Input
                                        value={newLocation.sheet_tab_name}
                                        onChange={e => setNewLocation({ ...newLocation, sheet_tab_name: e.target.value })}
                                        placeholder="Tampa (optional)"
                                        className="h-8 text-xs bg-background"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={isSubmitting}
                                    className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 h-8 text-xs">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Location'}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}
                                    className="h-8 text-xs">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAdding(true)}
                            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Add Location
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
