"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Loader2, X, MapPin, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LocationDraft {
    id: string; // temp key for UI
    location_name: string;
    city: string;
    state: string;
    sheet_tab_name: string;
}

interface AddGbpClientModalProps {
    onClientAdded: () => void;
}

export function AddGbpClientModal({ onClientAdded }: AddGbpClientModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMultiLocation, setIsMultiLocation] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        sitemap_url: '',
        key_selling_point: '',
        sheet_id: '',
        topics_tab_name: 'Topics',
    });

    // Location draft state
    const [locations, setLocations] = useState<LocationDraft[]>([]);
    const [locInput, setLocInput] = useState({ location_name: '', city: '', state: '', sheet_tab_name: '' });
    const [showLocForm, setShowLocForm] = useState(false);
    const locNameRef = useRef<HTMLInputElement>(null);

    const addLocation = () => {
        if (!locInput.location_name.trim() || !locInput.city.trim() || !locInput.state.trim()) return;
        setLocations(prev => [...prev, { ...locInput, id: crypto.randomUUID() }]);
        setLocInput({ location_name: '', city: '', state: '', sheet_tab_name: '' });
        setShowLocForm(false);
        setTimeout(() => locNameRef.current?.focus(), 50);
    };

    const removeLocation = (id: string) => setLocations(prev => prev.filter(l => l.id !== id));

    const reset = () => {
        setFormData({ name: '', industry: '', sitemap_url: '', key_selling_point: '', sheet_id: '', topics_tab_name: 'Topics' });
        setLocations([]);
        setLocInput({ location_name: '', city: '', state: '', sheet_tab_name: '' });
        setIsMultiLocation(false);
        setShowLocForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.industry || !formData.sitemap_url) return;
        if (isMultiLocation && locations.length === 0) {
            toast({ title: 'Add at least one location', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert client
            const { data: client, error: clientError } = await supabase
                .from('gbp_clients')
                .insert([{
                    name: formData.name,
                    industry: formData.industry,
                    sitemap_url: formData.sitemap_url,
                    key_selling_point: formData.key_selling_point || null,
                    sheet_id: formData.sheet_id || null,
                    topics_tab_name: formData.topics_tab_name || 'Topics',
                }])
                .select('id')
                .single();

            if (clientError) throw clientError;

            // 2. Insert locations if multi-location
            if (isMultiLocation && locations.length > 0) {
                const locationRows = locations.map(l => ({
                    gbp_client_id: client.id,
                    location_name: l.location_name,
                    city: l.city,
                    state: l.state,
                    sheet_tab_name: l.sheet_tab_name || null,
                    is_active: true,
                }));
                const { error: locError } = await supabase.from('gbp_locations').insert(locationRows);
                if (locError) throw locError;
            } else if (!isMultiLocation) {
                // Single-location: create one default location from sheet_tab_name
                await supabase.from('gbp_locations').insert([{
                    gbp_client_id: client.id,
                    location_name: formData.name,
                    city: '',
                    state: '',
                    sheet_tab_name: formData.topics_tab_name || 'Topics',
                    is_active: true,
                }]);
            }

            toast({ title: 'Client Added', description: `${formData.name} added with ${isMultiLocation ? locations.length + ' locations' : '1 location'}.` });
            reset();
            setIsOpen(false);
            onClientAdded();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = formData.name.trim() && formData.industry.trim() && formData.sitemap_url.trim();

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Add Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Add GBP Client</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure a new client for automated Google Business Profile post generation.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="gbp-name" className="text-sm font-semibold">Client Name <span className="text-destructive">*</span></Label>
                        <Input id="gbp-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Suncoast Skin Solutions" required className="bg-background border-input" />
                    </div>

                    {/* Industry */}
                    <div className="space-y-2">
                        <Label htmlFor="gbp-industry" className="text-sm font-semibold">Industry <span className="text-destructive">*</span></Label>
                        <Input id="gbp-industry" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })}
                            placeholder="e.g. Dermatology, Digital Marketing, HVAC" required className="bg-background border-input" />
                    </div>

                    {/* Sitemap URL */}
                    <div className="space-y-2">
                        <Label htmlFor="gbp-sitemap" className="text-sm font-semibold">Sitemap URL <span className="text-destructive">*</span></Label>
                        <Input id="gbp-sitemap" value={formData.sitemap_url} onChange={e => setFormData({ ...formData, sitemap_url: e.target.value })}
                            placeholder="https://example.com/page-sitemap.xml" required className="bg-background border-input" />
                        <p className="text-xs text-muted-foreground">Used by n8n to pick the most relevant internal link per post.</p>
                    </div>

                    {/* Key Selling Point */}
                    <div className="space-y-2">
                        <Label htmlFor="gbp-ksp" className="text-sm font-semibold">Key Selling Point <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                        <Textarea id="gbp-ksp" value={formData.key_selling_point} onChange={e => setFormData({ ...formData, key_selling_point: e.target.value })}
                            placeholder="e.g. Award-winning dermatology clinic with 10 locations across Florida"
                            className="bg-background border-input resize-none h-20" />
                    </div>

                    {/* Sheet ID */}
                    <div className="space-y-2">
                        <Label htmlFor="gbp-sheet" className="text-sm font-semibold">Google Sheet ID <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                        <Input id="gbp-sheet" value={formData.sheet_id} onChange={e => setFormData({ ...formData, sheet_id: e.target.value })}
                            placeholder="1xh0As6rrHv9WqCDqfgUyvJm8WCPvLf1Hks5RFf-Sf0A" className="bg-background border-input" />
                        <p className="text-xs text-muted-foreground">The ID from the Google Sheets URL — n8n reads topics from this sheet.</p>
                    </div>

                    {/* Topics Tab Name (single-location only) */}
                    {!isMultiLocation && (
                        <div className="space-y-2">
                            <Label htmlFor="gbp-tab" className="text-sm font-semibold">Topics Tab Name</Label>
                            <Input id="gbp-tab" value={formData.topics_tab_name} onChange={e => setFormData({ ...formData, topics_tab_name: e.target.value })}
                                placeholder="Topics" className="bg-background border-input" />
                            <p className="text-xs text-muted-foreground">Name of the tab in the sheet containing the topic list.</p>
                        </div>
                    )}

                    {/* ── Multi-Location Toggle ─────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-brand-blue-crayola" />
                            <div>
                                <p className="text-sm font-semibold text-foreground">Multi-Location Client</p>
                                <p className="text-xs text-muted-foreground">Enable if this client has multiple GBP locations</p>
                            </div>
                        </div>
                        <Switch
                            checked={isMultiLocation}
                            onCheckedChange={(v) => { setIsMultiLocation(v); setLocations([]); setShowLocForm(false); }}
                        />
                    </div>

                    {/* ── Location Builder ──────────────────────────────── */}
                    {isMultiLocation && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <Label className="text-sm font-semibold flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-brand-blue-crayola" />
                                Locations <span className="text-destructive">*</span>
                            </Label>

                            {/* Location Badges */}
                            {locations.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-background rounded-xl border border-border/50 min-h-[48px]">
                                    {locations.map(loc => (
                                        <div key={loc.id}
                                            className="flex items-center gap-1.5 bg-brand-blue-crayola/10 text-brand-blue-crayola border border-brand-blue-crayola/20 rounded-full px-3 py-1 text-xs font-semibold">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            <span>{loc.location_name}</span>
                                            <span className="text-brand-blue-crayola/60 font-normal">· {loc.city}, {loc.state}</span>
                                            {loc.sheet_tab_name && (
                                                <span className="text-brand-blue-crayola/50 font-mono text-[10px]">({loc.sheet_tab_name})</span>
                                            )}
                                            <button type="button" onClick={() => removeLocation(loc.id)}
                                                className="ml-0.5 hover:text-destructive transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Location Form */}
                            {showLocForm ? (
                                <div className="p-3 bg-background rounded-xl border border-brand-blue-crayola/20 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Location Name *</Label>
                                            <Input
                                                ref={locNameRef}
                                                value={locInput.location_name}
                                                onChange={e => setLocInput({ ...locInput, location_name: e.target.value })}
                                                placeholder="e.g. Tampa"
                                                className="h-8 text-xs bg-muted/30"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">City *</Label>
                                            <Input
                                                value={locInput.city}
                                                onChange={e => setLocInput({ ...locInput, city: e.target.value })}
                                                placeholder="Tampa"
                                                className="h-8 text-xs bg-muted/30"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">State *</Label>
                                            <Input
                                                value={locInput.state}
                                                onChange={e => setLocInput({ ...locInput, state: e.target.value })}
                                                placeholder="FL"
                                                className="h-8 text-xs bg-muted/30"
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Sheet Tab Name</Label>
                                            <Input
                                                value={locInput.sheet_tab_name}
                                                onChange={e => setLocInput({ ...locInput, sheet_tab_name: e.target.value })}
                                                placeholder="Tampa (optional)"
                                                className="h-8 text-xs bg-muted/30"
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" size="sm"
                                            onClick={addLocation}
                                            disabled={!locInput.location_name.trim() || !locInput.city.trim() || !locInput.state.trim()}
                                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 h-8 text-xs gap-1.5">
                                            <Plus className="w-3.5 h-3.5" /> Add Location
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowLocForm(false)} className="h-8 text-xs">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button type="button" variant="outline" size="sm"
                                    onClick={() => { setShowLocForm(true); setTimeout(() => locNameRef.current?.focus(), 50); }}
                                    className="h-8 text-xs gap-1.5 border-dashed border-brand-blue-crayola/40 text-brand-blue-crayola hover:bg-brand-blue-crayola/5">
                                    <Plus className="w-3.5 h-3.5" /> Add Location
                                </Button>
                            )}

                            {locations.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Add at least one location to continue.</p>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !isValid || (isMultiLocation && locations.length === 0)}
                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90">
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Client'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
