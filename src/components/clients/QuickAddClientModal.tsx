"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type QuickAddService = 'content' | 'gbp' | 'indexing';

interface SavedClient {
    id: string;
    name: string;
    industry: string | null;
    website_url: string | null;
}

interface QuickAddClientModalProps {
    service: QuickAddService;
    trigger: React.ReactNode;
    onSaved: (client: SavedClient) => void;
}

interface ClientMatch {
    id: string;
    name: string;
    content_enabled: boolean;
    gbp_enabled: boolean;
    indexing_enabled: boolean;
}

interface FullClient extends ClientMatch {
    industry: string | null;
    website_url: string | null;
    key_selling_point: string | null;
    sitemap_url: string | null;
    gbp_sheet_id: string | null;
    gbp_topics_tab_name: string | null;
    indexing_workbook_url: string | null;
    indexing_tab_name: string | null;
    indexing_gsc_property: string | null;
    indexing_bing_site_url: string | null;
}

const SERVICE_ENABLED_KEY = {
    content: 'content_enabled',
    gbp: 'gbp_enabled',
    indexing: 'indexing_enabled',
} as const;

const SERVICE_LABEL = {
    content: 'Content Briefs',
    gbp: 'GBP Posts',
    indexing: 'Indexing',
} as const;

const emptyForm = {
    name: '',
    industry: '',
    website_url: '',
    key_selling_point: '',
    sitemap_url: '',
    gbp_sheet_id: '',
    gbp_topics_tab_name: 'Topics',
    indexing_workbook_url: '',
    indexing_tab_name: 'Indexing Automation',
    indexing_gsc_property: '',
    indexing_bing_site_url: '',
};

function toForm(c: FullClient): typeof emptyForm {
    return {
        name: c.name,
        industry: c.industry || '',
        website_url: c.website_url || '',
        key_selling_point: c.key_selling_point || '',
        sitemap_url: c.sitemap_url || '',
        gbp_sheet_id: c.gbp_sheet_id || '',
        gbp_topics_tab_name: c.gbp_topics_tab_name || 'Topics',
        indexing_workbook_url: c.indexing_workbook_url || '',
        indexing_tab_name: c.indexing_tab_name || 'Indexing Automation',
        indexing_gsc_property: c.indexing_gsc_property || '',
        indexing_bing_site_url: c.indexing_bing_site_url || '',
    };
}

export function QuickAddClientModal({ service, trigger, onSaved }: QuickAddClientModalProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [linkedClient, setLinkedClient] = useState<FullClient | null>(null);
    const [matches, setMatches] = useState<ClientMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const enabledKey = SERVICE_ENABLED_KEY[service];

    useEffect(() => {
        if (!isOpen) {
            setFormData(emptyForm);
            setLinkedClient(null);
            setMatches([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const query = formData.name.trim();
        if (linkedClient || query.length < 2) {
            setMatches([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, content_enabled, gbp_enabled, indexing_enabled')
                .ilike('name', `%${query}%`)
                .order('name')
                .limit(6);
            setIsSearching(false);
            if (!error) {
                setMatches((data || []) as ClientMatch[]);
                setShowDropdown(true);
            }
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.name, linkedClient]);

    const handleMatchSelected = async (match: ClientMatch) => {
        const { data, error } = await supabase
            .from('clients')
            .select('id, name, industry, website_url, content_enabled, gbp_enabled, indexing_enabled, key_selling_point, sitemap_url, gbp_sheet_id, gbp_topics_tab_name, indexing_workbook_url, indexing_tab_name, indexing_gsc_property, indexing_bing_site_url')
            .eq('id', match.id)
            .single();
        if (error || !data) {
            toast({ title: 'Error', description: error?.message || 'Could not load that client.', variant: 'destructive' });
            return;
        }
        const full = data as FullClient;
        setLinkedClient(full);
        setFormData(toForm(full));
        setShowDropdown(false);
    };

    const clearMatch = () => {
        const name = formData.name;
        setLinkedClient(null);
        setFormData({ ...emptyForm, name });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        if (service === 'indexing' && (!formData.indexing_workbook_url || !formData.indexing_gsc_property)) return;

        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = {
                name: formData.name,
                industry: formData.industry || null,
                [enabledKey]: true,
            };

            if (service === 'content') {
                payload.website_url = formData.website_url || null;
            } else if (service === 'gbp') {
                payload.key_selling_point = formData.key_selling_point || null;
                payload.sitemap_url = formData.sitemap_url || null;
                payload.gbp_sheet_id = formData.gbp_sheet_id || null;
                payload.gbp_topics_tab_name = formData.gbp_topics_tab_name || 'Topics';
            } else if (service === 'indexing') {
                payload.indexing_workbook_url = formData.indexing_workbook_url || null;
                payload.indexing_tab_name = formData.indexing_tab_name || 'Indexing Automation';
                payload.indexing_gsc_property = formData.indexing_gsc_property || null;
                payload.indexing_bing_site_url = formData.indexing_bing_site_url || null;
            }

            let savedId = linkedClient?.id;
            if (linkedClient) {
                // Only this service's fields (+ name/industry) are ever touched here —
                // whatever the client already has configured for other services is untouched.
                const { error } = await supabase.from('clients').update(payload).eq('id', linkedClient.id);
                if (error) throw error;
            } else {
                (['content_enabled', 'gbp_enabled', 'indexing_enabled'] as const)
                    .filter((k) => k !== enabledKey)
                    .forEach((k) => { payload[k] = false; });
                const { data, error } = await supabase.from('clients').insert([payload]).select('id').single();
                if (error) throw error;
                savedId = data.id;
            }

            toast({
                title: linkedClient ? 'Client updated' : 'Client added',
                description: linkedClient
                    ? `${SERVICE_LABEL[service]} enabled for ${formData.name}.`
                    : `${formData.name} has been added successfully.`,
            });

            onSaved({
                id: savedId!,
                name: formData.name,
                industry: formData.industry || null,
                website_url: service === 'content' ? (formData.website_url || null) : (linkedClient?.website_url ?? null),
            });
            setIsOpen(false);
        } catch (error: any) {
            console.error('Error saving client:', error);
            toast({ title: 'Error', description: error.message || 'Failed to save client.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = !!formData.name && !(service === 'indexing' && (!formData.indexing_workbook_url || !formData.indexing_gsc_property));

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {linkedClient ? `Update ${linkedClient.name}` : `Add Client — ${SERVICE_LABEL[service]}`}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {linkedClient
                            ? `This client already exists — saving enables ${SERVICE_LABEL[service]} on their existing record instead of creating a duplicate.`
                            : `Quickly add a client with just what ${SERVICE_LABEL[service]} needs.`}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {linkedClient && (
                        <div className="flex items-center justify-between gap-3 p-3 bg-brand-blue-crayola/5 border border-brand-blue-crayola/20 rounded-lg text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue-crayola shrink-0" />
                                <span>Matched existing client</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-[11px]" onClick={clearMatch}>
                                <X className="w-3 h-3" /> Not this client
                            </Button>
                        </div>
                    )}

                    <div className="space-y-2 relative">
                        <Label htmlFor="qa-name" className="text-sm font-semibold">
                            Client Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="qa-name"
                            value={formData.name}
                            onChange={(e) => {
                                if (linkedClient) setLinkedClient(null);
                                setFormData({ ...formData, name: e.target.value });
                            }}
                            onFocus={() => matches.length > 0 && setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            placeholder="e.g. Suncoast Skin Solutions"
                            required
                            autoComplete="off"
                            disabled={!!linkedClient}
                            className="bg-background border-input"
                        />
                        {!linkedClient && isSearching && (
                            <p className="text-xs text-muted-foreground">Checking existing clients...</p>
                        )}
                        {!linkedClient && showDropdown && matches.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
                                    Already exists — select to avoid a duplicate
                                </p>
                                {matches.map((m) => {
                                    const active = ([
                                        m.content_enabled && 'Content',
                                        m.gbp_enabled && 'GBP',
                                        m.indexing_enabled && 'Indexing',
                                    ] as const).filter(Boolean) as string[];
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onMouseDown={(e) => { e.preventDefault(); handleMatchSelected(m); }}
                                            className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                                        >
                                            <span className="text-sm font-medium text-foreground">{m.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{active.length > 0 ? active.join(' · ') : 'No services yet'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qa-industry" className="text-sm font-semibold">
                            Industry <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="qa-industry"
                            value={formData.industry}
                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            placeholder="e.g. Dermatology, Digital Marketing"
                            className="bg-background border-input"
                        />
                    </div>

                    {service === 'content' && (
                        <div className="space-y-2">
                            <Label htmlFor="qa-website" className="text-sm font-semibold">
                                Website URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                            </Label>
                            <Input
                                id="qa-website"
                                type="url"
                                value={formData.website_url}
                                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                placeholder="https://www.clientwebsite.com"
                                className="bg-background border-input"
                            />
                            <p className="text-xs text-muted-foreground">Auto-fills the website field on future content requests for this client.</p>
                        </div>
                    )}

                    {service === 'gbp' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="qa-ksp" className="text-sm font-semibold">
                                    Key Selling Point <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="qa-ksp"
                                    value={formData.key_selling_point}
                                    onChange={(e) => setFormData({ ...formData, key_selling_point: e.target.value })}
                                    placeholder="e.g. Board-certified dermatologists, 10 Florida locations"
                                    className="bg-background border-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qa-sitemap" className="text-sm font-semibold">
                                    Sitemap URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="qa-sitemap"
                                    value={formData.sitemap_url}
                                    onChange={(e) => setFormData({ ...formData, sitemap_url: e.target.value })}
                                    placeholder="https://example.com/page-sitemap.xml"
                                    className="bg-background border-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qa-sheet" className="text-sm font-semibold">
                                    Google Sheet ID <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="qa-sheet"
                                    value={formData.gbp_sheet_id}
                                    onChange={(e) => setFormData({ ...formData, gbp_sheet_id: e.target.value })}
                                    placeholder="1xh0As6rrHv9WqCDqfgUyvJm8WCPvLf1Hks5RFf-Sf0A"
                                    className="bg-background border-input"
                                />
                            </div>
                        </>
                    )}

                    {service === 'indexing' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="qa-idx-workbook" className="text-sm font-semibold">
                                    Indexing Workbook URL <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="qa-idx-workbook"
                                    value={formData.indexing_workbook_url}
                                    onChange={(e) => setFormData({ ...formData, indexing_workbook_url: e.target.value })}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    required
                                    className="bg-background border-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qa-idx-gsc" className="text-sm font-semibold">
                                    GSC Property <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="qa-idx-gsc"
                                    value={formData.indexing_gsc_property}
                                    onChange={(e) => setFormData({ ...formData, indexing_gsc_property: e.target.value })}
                                    placeholder="https://example.com/ or sc-domain:example.com"
                                    required
                                    className="bg-background border-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qa-idx-bing" className="text-sm font-semibold">
                                    Bing Site URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="qa-idx-bing"
                                    value={formData.indexing_bing_site_url}
                                    onChange={(e) => setFormData({ ...formData, indexing_bing_site_url: e.target.value })}
                                    placeholder="https://example.com"
                                    className="bg-background border-input"
                                />
                            </div>
                        </>
                    )}

                    <p className="text-xs text-muted-foreground/70">
                        Need more control (locations, other services)? Use{' '}
                        <a href="/settings/clients" className="underline hover:text-foreground">Client Management</a>.
                    </p>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !canSubmit} className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90">
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{linkedClient ? 'Saving...' : 'Adding...'}</>
                            ) : (
                                linkedClient ? 'Save Changes' : 'Add Client'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
