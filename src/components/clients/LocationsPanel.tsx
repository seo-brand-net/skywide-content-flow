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
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Loader2, MapPin, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
    id: string;
    name: string;
}

interface Location {
    id: string;
    client_id: string;
    location_name: string;
    city: string;
    state: string;
    gbp_account_id: string | null;
    sheet_tab_name: string | null;
    is_active: boolean;
    created_at: string;
}

interface LocationsPanelProps {
    client: Client;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationsPanel({ client }: LocationsPanelProps) {
    const { toast } = useToast();
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newLocation, setNewLocation] = useState({
        location_name: '',
        city: '',
        state: '',
        sheet_tab_name: '',
        gbp_account_id: '',
        is_active: true,
    });

    const loadLocations = async () => {
        if (isLoaded) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('client_locations')
            .select('*')
            .eq('client_id', client.id)
            .order('location_name');
        setIsLoading(false);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            return;
        }
        setLocations(data as Location[]);
        setIsLoaded(true);
    };

    const handleToggle = async () => {
        const next = !isExpanded;
        setIsExpanded(next);
        if (next) await loadLocations();
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocation.location_name || !newLocation.city || !newLocation.state) return;
        setIsSubmitting(true);
        const { data, error } = await supabase
            .from('client_locations')
            .insert([{
                client_id: client.id,
                location_name: newLocation.location_name,
                city: newLocation.city,
                state: newLocation.state,
                sheet_tab_name: newLocation.sheet_tab_name || null,
                gbp_account_id: newLocation.gbp_account_id || null,
                is_active: newLocation.is_active,
            }])
            .select()
            .single();
        setIsSubmitting(false);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            return;
        }
        setLocations((prev) => [...prev, data as Location].sort((a, b) =>
            a.location_name.localeCompare(b.location_name)
        ));
        setNewLocation({ location_name: '', city: '', state: '', sheet_tab_name: '', gbp_account_id: '', is_active: true });
        setIsAddOpen(false);
        toast({ title: 'Location added', description: `${data.location_name} added to ${client.name}.` });
    };

    const toggleActive = async (loc: Location) => {
        const { error } = await supabase
            .from('client_locations')
            .update({ is_active: !loc.is_active })
            .eq('id', loc.id);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            return;
        }
        setLocations((prev) =>
            prev.map((l) => (l.id === loc.id ? { ...l, is_active: !l.is_active } : l))
        );
    };

    const deleteLocation = async (loc: Location) => {
        if (!confirm(`Delete ${loc.location_name}? This cannot be undone.`)) return;
        const { error } = await supabase
            .from('client_locations')
            .delete()
            .eq('id', loc.id);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            return;
        }
        setLocations((prev) => prev.filter((l) => l.id !== loc.id));
        toast({ title: 'Location removed', description: `${loc.location_name} deleted.` });
    };

    return (
        <div className="mt-2">
            {/* Toggle button */}
            <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
                onClick={handleToggle}
            >
                <MapPin className="w-3.5 h-3.5" />
                {isExpanded ? 'Hide Locations' : 'Manage Locations'}
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>

            {isExpanded && (
                <div className="mt-3 space-y-2 pl-1">
                    {isLoading ? (
                        <p className="text-xs text-muted-foreground animate-pulse px-1">Loading locations...</p>
                    ) : locations.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">No locations added yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {locations.map((loc) => (
                                <div
                                    key={loc.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 border border-border/40 group"
                                >
                                    <Switch
                                        checked={loc.is_active}
                                        onCheckedChange={() => toggleActive(loc)}
                                        className="scale-75 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                            {loc.location_name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {loc.city}, {loc.state}
                                            {loc.sheet_tab_name && (
                                                <span className="ml-2 font-mono opacity-60">tab: {loc.sheet_tab_name}</span>
                                            )}
                                        </p>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${loc.is_active
                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                            : 'bg-muted/20 text-muted-foreground border-border/30'
                                        }`}>
                                        {loc.is_active ? 'Active' : 'Paused'}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteLocation(loc)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add location button / form */}
                    {!isAddOpen ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs mt-1"
                            onClick={() => setIsAddOpen(true)}
                        >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Add Location
                        </Button>
                    ) : (
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogContent className="sm:max-w-[440px] bg-card border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-bold">Add Location</DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-sm">
                                        Adding a location to <span className="font-semibold text-foreground">{client.name}</span>
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleAddLocation} className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="loc-name" className="text-sm font-semibold">
                                            Location Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="loc-name"
                                            value={newLocation.location_name}
                                            onChange={(e) => setNewLocation({ ...newLocation, location_name: e.target.value })}
                                            placeholder="e.g. Tampa, Largo, Boca Raton"
                                            required
                                            className="bg-background border-input"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="loc-city" className="text-sm font-semibold">
                                                City <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="loc-city"
                                                value={newLocation.city}
                                                onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                                                placeholder="Tampa"
                                                required
                                                className="bg-background border-input"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="loc-state" className="text-sm font-semibold">
                                                State <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="loc-state"
                                                value={newLocation.state}
                                                onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                                                placeholder="FL"
                                                required
                                                className="bg-background border-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="loc-tab" className="text-sm font-semibold">
                                            Sheet Tab Name <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                        </Label>
                                        <Input
                                            id="loc-tab"
                                            value={newLocation.sheet_tab_name}
                                            onChange={(e) => setNewLocation({ ...newLocation, sheet_tab_name: e.target.value })}
                                            placeholder="e.g. Tampa (maps to the existing sheet tab)"
                                            className="bg-background border-input"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 py-1">
                                        <Switch
                                            id="loc-active"
                                            checked={newLocation.is_active}
                                            onCheckedChange={(checked) => setNewLocation({ ...newLocation, is_active: checked })}
                                        />
                                        <Label htmlFor="loc-active" className="text-sm font-medium cursor-pointer">
                                            Active
                                        </Label>
                                    </div>

                                    <DialogFooter className="pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || !newLocation.location_name || !newLocation.city || !newLocation.state}
                                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90"
                                        >
                                            {isSubmitting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                                            ) : 'Add Location'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            )}
        </div>
    );
}
