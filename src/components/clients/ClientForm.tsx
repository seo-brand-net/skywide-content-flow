"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, FileText, MapPin, Globe, Save, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { LocationsPanel } from '@/components/clients/LocationsPanel';

export interface EditableClient {
    id: string;
    name: string;
    workbook_url: string | null;
    folder_url: string | null;
    website_url: string | null;
    sitemap_url: string | null;
    industry: string | null;
    key_selling_point: string | null;
    content_enabled: boolean;
    gbp_enabled: boolean;
    indexing_enabled: boolean;
    gbp_sheet_id: string | null;
    gbp_topics_tab_name: string | null;
    indexing_workbook_url: string | null;
    indexing_tab_name: string | null;
    indexing_gsc_property: string | null;
    indexing_bing_site_url: string | null;
}

type ServiceKey = 'content_enabled' | 'gbp_enabled' | 'indexing_enabled';

const SERVICE_LABELS: Record<ServiceKey, string> = {
    content_enabled: 'Content Briefs',
    gbp_enabled: 'GBP Posts',
    indexing_enabled: 'Indexing',
};

interface ClientFormProps {
    client?: EditableClient;
    /** When arriving from an automation page (e.g. Indexing's "Add Client"), pre-enable this service. */
    defaultService?: 'content' | 'gbp' | 'indexing';
    /** Where to send the user after a successful save — defaults to /settings/clients. */
    returnTo?: string;
}

const emptyFormData = {
    name: '',
    workbook_url: '',
    folder_url: '',
    website_url: '',
    sitemap_url: '',
    industry: '',
    key_selling_point: '',
    content_enabled: true,
    gbp_enabled: false,
    indexing_enabled: false,
    gbp_sheet_id: '',
    gbp_topics_tab_name: 'Topics',
    indexing_workbook_url: '',
    indexing_tab_name: 'Indexing Automation',
    indexing_gsc_property: '',
    indexing_bing_site_url: '',
};

function toFormData(client: EditableClient): typeof emptyFormData {
    return {
        name: client.name,
        workbook_url: client.workbook_url || '',
        folder_url: client.folder_url || '',
        website_url: client.website_url || '',
        sitemap_url: client.sitemap_url || '',
        industry: client.industry || '',
        key_selling_point: client.key_selling_point || '',
        content_enabled: client.content_enabled,
        gbp_enabled: client.gbp_enabled,
        indexing_enabled: client.indexing_enabled,
        gbp_sheet_id: client.gbp_sheet_id || '',
        gbp_topics_tab_name: client.gbp_topics_tab_name || 'Topics',
        indexing_workbook_url: client.indexing_workbook_url || '',
        indexing_tab_name: client.indexing_tab_name || 'Indexing Automation',
        indexing_gsc_property: client.indexing_gsc_property || '',
        indexing_bing_site_url: client.indexing_bing_site_url || '',
    };
}

function serviceKeyFor(defaultService?: 'content' | 'gbp' | 'indexing'): ServiceKey | null {
    if (defaultService === 'content') return 'content_enabled';
    if (defaultService === 'gbp') return 'gbp_enabled';
    if (defaultService === 'indexing') return 'indexing_enabled';
    return null;
}

function initialFormData(client: EditableClient | undefined, defaultService: 'content' | 'gbp' | 'indexing' | undefined) {
    const base = client ? toFormData(client) : { ...emptyFormData };
    const key = serviceKeyFor(defaultService);
    if (key && !client) base[key] = true;
    return base;
}

// ─── Section wrapper for a conditionally-revealed service config block ───────
function ServiceSection({
    active,
    color,
    icon: Icon,
    title,
    highlighted,
    children,
}: {
    active: boolean;
    color: 'blue' | 'green' | 'purple';
    icon: React.ElementType;
    title: string;
    highlighted?: boolean;
    children: React.ReactNode;
}) {
    if (!active) return null;
    const colorClasses = {
        blue: 'bg-brand-blue-crayola/5 border-brand-blue-crayola/20 text-brand-blue-crayola',
        green: 'bg-green-500/5 border-green-500/20 text-green-600',
        purple: 'bg-purple-500/5 border-purple-500/20 text-purple-600',
    }[color];
    return (
        <div className={`rounded-2xl border p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 ${colorClasses} ${highlighted ? 'ring-2 ring-offset-2 ring-offset-background ring-current' : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
                </div>
                {highlighted && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-current/10">
                        Configure this
                    </span>
                )}
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

// ─── Client name field with existing-client typeahead (create mode only) ─────
interface ClientMatch {
    id: string;
    name: string;
    content_enabled: boolean;
    gbp_enabled: boolean;
    indexing_enabled: boolean;
}

function ClientNameField({
    name,
    onNameChange,
    onMatchSelected,
    disabled,
}: {
    name: string;
    onNameChange: (name: string) => void;
    onMatchSelected: (match: ClientMatch) => void;
    disabled: boolean;
}) {
    const [matches, setMatches] = useState<ClientMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const query = name.trim();
        if (disabled || query.length < 2) {
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
    }, [name, disabled]);

    return (
        <div className="space-y-2 relative">
            <Label htmlFor="client-name" className="text-sm font-semibold">
                Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
                id="client-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onFocus={() => matches.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="e.g. Suncoast Skin Solutions"
                required
                autoComplete="off"
                disabled={disabled}
                className="bg-background border-input"
            />
            {!disabled && isSearching && (
                <p className="text-xs text-muted-foreground">Checking existing clients...</p>
            )}
            {!disabled && showDropdown && matches.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/50">
                        Already exists — select to extend instead of creating a duplicate
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
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onMatchSelected(m);
                                    setShowDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                            >
                                <span className="text-sm font-medium text-foreground">{m.name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {active.length > 0 ? active.join(' · ') : 'No services yet'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function ClientForm({ client, defaultService, returnTo }: ClientFormProps) {
    const isEditMode = !!client;
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(initialFormData(client, defaultService));
    const [linkedClient, setLinkedClient] = useState<EditableClient | null>(null);

    const targetServiceKey = serviceKeyFor(defaultService);
    const effectiveClientId = client?.id ?? linkedClient?.id ?? null;
    const isExtendingExisting = !isEditMode && !!linkedClient;

    const handleMatchSelected = async (match: ClientMatch) => {
        const { data, error } = await supabase
            .from('clients')
            .select('id, name, industry, sitemap_url, key_selling_point, workbook_url, folder_url, website_url, content_enabled, gbp_enabled, indexing_enabled, gbp_sheet_id, gbp_topics_tab_name, indexing_workbook_url, indexing_tab_name, indexing_gsc_property, indexing_bing_site_url')
            .eq('id', match.id)
            .single();
        if (error || !data) {
            toast({ title: 'Error', description: error?.message || 'Could not load that client.', variant: 'destructive' });
            return;
        }
        const full = data as EditableClient;
        setLinkedClient(full);
        const next = toFormData(full);
        if (targetServiceKey) next[targetServiceKey] = true;
        setFormData(next);
    };

    const clearMatch = () => {
        setLinkedClient(null);
        setFormData(initialFormData(undefined, defaultService));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSubmitting(true);
        try {
            let folderId = '';
            if (formData.folder_url.includes('/folders/')) {
                folderId = formData.folder_url.split('/folders/')[1].split('?')[0];
            }

            const payload = {
                name: formData.name,
                industry: formData.industry || null,
                website_url: formData.website_url || null,
                content_enabled: formData.content_enabled,
                gbp_enabled: formData.gbp_enabled,
                indexing_enabled: formData.indexing_enabled,
                workbook_url: formData.content_enabled ? (formData.workbook_url || null) : null,
                folder_url: formData.content_enabled ? (formData.folder_url || null) : null,
                folder_id: formData.content_enabled ? (folderId || null) : null,
                sitemap_url: formData.gbp_enabled ? (formData.sitemap_url || null) : null,
                key_selling_point: formData.gbp_enabled ? (formData.key_selling_point || null) : null,
                gbp_sheet_id: formData.gbp_enabled ? (formData.gbp_sheet_id || null) : null,
                gbp_topics_tab_name: formData.gbp_enabled ? (formData.gbp_topics_tab_name || 'Topics') : null,
                indexing_workbook_url: formData.indexing_enabled ? (formData.indexing_workbook_url || null) : null,
                indexing_tab_name: formData.indexing_enabled ? (formData.indexing_tab_name || 'Indexing Automation') : null,
                indexing_gsc_property: formData.indexing_enabled ? (formData.indexing_gsc_property || null) : null,
                indexing_bing_site_url: formData.indexing_enabled ? (formData.indexing_bing_site_url || null) : null,
            };

            const { error } = effectiveClientId
                ? await supabase.from('clients').update(payload).eq('id', effectiveClientId)
                : await supabase.from('clients').insert([payload]);

            if (error) throw error;

            toast({
                title: isExtendingExisting ? 'Client updated' : isEditMode ? 'Client updated' : 'Client added',
                description: isExtendingExisting && targetServiceKey
                    ? `${SERVICE_LABELS[targetServiceKey]} enabled for ${formData.name}.`
                    : `${formData.name} has been ${isEditMode || isExtendingExisting ? 'updated' : 'added'} successfully.`,
            });

            router.push(returnTo || '/settings/clients');
            router.refresh();
        } catch (error: any) {
            console.error('Error saving client:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save client.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit =
        !!formData.name &&
        !(formData.indexing_enabled && (!formData.indexing_workbook_url || !formData.indexing_gsc_property)) &&
        !(formData.gbp_enabled && !formData.gbp_sheet_id) &&
        !(formData.content_enabled && (!formData.workbook_url || !formData.folder_url));

    // ── Service config sections, order-able so the automation you arrived to
    //    configure (defaultService) always shows first instead of wherever it
    //    happens to fall in the fixed Content → GBP → Indexing layout. ────────

    const contentSection = (
        <ServiceSection key="content_enabled" active={formData.content_enabled} color="blue" icon={FileText} title="Content Briefs Config" highlighted={targetServiceKey === 'content_enabled'}>
            <div className="space-y-2">
                <Label htmlFor="client-workbook" className="text-xs font-semibold">
                    Workbook URL <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="client-workbook"
                    value={formData.workbook_url}
                    onChange={(e) => setFormData({ ...formData, workbook_url: e.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    required={formData.content_enabled}
                    className="bg-background border-input h-9 text-sm"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-folder" className="text-xs font-semibold">
                    Drive Folder URL <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="client-folder"
                    value={formData.folder_url}
                    onChange={(e) => setFormData({ ...formData, folder_url: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                    required={formData.content_enabled}
                    className="bg-background border-input h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground/70">Both are required to run Content Briefs generation for this client.</p>
            </div>
        </ServiceSection>
    );

    const gbpSection = (
        <ServiceSection key="gbp_enabled" active={formData.gbp_enabled} color="green" icon={MapPin} title="GBP Config" highlighted={targetServiceKey === 'gbp_enabled'}>
            <div className="space-y-2">
                <Label htmlFor="client-ksp" className="text-xs font-semibold">
                    Key Selling Point <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                    id="client-ksp"
                    value={formData.key_selling_point}
                    onChange={(e) => setFormData({ ...formData, key_selling_point: e.target.value })}
                    placeholder="e.g. Board-certified dermatologists, 10 Florida locations"
                    className="bg-background border-input h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground/70">Used to personalize generated post content.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-sitemap" className="text-xs font-semibold">
                    Sitemap URL <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                    id="client-sitemap"
                    value={formData.sitemap_url}
                    onChange={(e) => setFormData({ ...formData, sitemap_url: e.target.value })}
                    placeholder="https://example.com/page-sitemap.xml"
                    className="bg-background border-input h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground/70">Used to pick the best internal link per post.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-gbp-sheet" className="text-xs font-semibold">
                    Google Sheet ID <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="client-gbp-sheet"
                    value={formData.gbp_sheet_id}
                    onChange={(e) => setFormData({ ...formData, gbp_sheet_id: e.target.value })}
                    placeholder="1xh0As6rrHv9WqCDqfgUyvJm8WCPvLf1Hks5RFf-Sf0A"
                    required={formData.gbp_enabled}
                    className="bg-background border-input h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground/70">Required — GBP post generation reads topics from this sheet.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-gbp-tab" className="text-xs font-semibold">Topics Tab Name</Label>
                <Input
                    id="client-gbp-tab"
                    value={formData.gbp_topics_tab_name}
                    onChange={(e) => setFormData({ ...formData, gbp_topics_tab_name: e.target.value })}
                    placeholder="Topics"
                    className="bg-background border-input h-9 text-sm"
                />
            </div>

            {isEditMode ? (
                <div className="pt-2 border-t border-green-500/10">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Locations
                    </p>
                    <LocationsPanel client={client!} />
                </div>
            ) : isExtendingExisting ? (
                <div className="pt-2 border-t border-green-500/10">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Locations
                    </p>
                    <LocationsPanel client={linkedClient!} />
                </div>
            ) : (
                <p className="text-xs text-muted-foreground/70 pt-2 border-t border-green-500/10">
                    Locations for multi-location clients (e.g. Suncoast) can be added after saving.
                </p>
            )}
        </ServiceSection>
    );

    const indexingSection = (
        <ServiceSection key="indexing_enabled" active={formData.indexing_enabled} color="purple" icon={Globe} title="Indexing Config" highlighted={targetServiceKey === 'indexing_enabled'}>
            <div className="space-y-2">
                <Label htmlFor="client-idx-workbook" className="text-xs font-semibold">
                    Indexing Workbook URL <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="client-idx-workbook"
                    value={formData.indexing_workbook_url}
                    onChange={(e) => setFormData({ ...formData, indexing_workbook_url: e.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    required={formData.indexing_enabled}
                    className="bg-background border-input h-9 text-sm"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-idx-tab" className="text-xs font-semibold">Tab Name</Label>
                <Input
                    id="client-idx-tab"
                    value={formData.indexing_tab_name}
                    onChange={(e) => setFormData({ ...formData, indexing_tab_name: e.target.value })}
                    placeholder="Indexing Automation"
                    className="bg-background border-input h-9 text-sm"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-idx-gsc" className="text-xs font-semibold">
                    GSC Property <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="client-idx-gsc"
                    value={formData.indexing_gsc_property}
                    onChange={(e) => setFormData({ ...formData, indexing_gsc_property: e.target.value })}
                    placeholder="https://example.com/ or sc-domain:example.com"
                    required={formData.indexing_enabled}
                    className="bg-background border-input h-9 text-sm"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="client-idx-bing" className="text-xs font-semibold">
                    Bing Site URL <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                    id="client-idx-bing"
                    value={formData.indexing_bing_site_url}
                    onChange={(e) => setFormData({ ...formData, indexing_bing_site_url: e.target.value })}
                    placeholder="https://example.com"
                    className="bg-background border-input h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground/70">Leave blank to skip Bing indexing for this client.</p>
            </div>
        </ServiceSection>
    );

    const sectionsByKey: Record<ServiceKey, React.ReactNode> = {
        content_enabled: contentSection,
        gbp_enabled: gbpSection,
        indexing_enabled: indexingSection,
    };
    const baseOrder: ServiceKey[] = ['content_enabled', 'gbp_enabled', 'indexing_enabled'];
    const sectionOrder: ServiceKey[] = targetServiceKey
        ? [targetServiceKey, ...baseOrder.filter((k) => k !== targetServiceKey)]
        : baseOrder;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-3xl mx-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-2"
                    onClick={() => router.push(returnTo || '/settings/clients')}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        {isEditMode ? `Edit ${client!.name}` : isExtendingExisting ? `Update ${linkedClient!.name}` : 'Add New Client'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isExtendingExisting
                            ? "This client already exists — saving will update their existing record, not create a duplicate."
                            : "Configure this client and choose which automations to enable. Each service's settings only appear once that service is turned on."}
                    </p>
                </div>

                {isExtendingExisting && (
                    <div className="mb-6 flex items-center justify-between gap-3 p-4 bg-brand-blue-crayola/5 border border-brand-blue-crayola/20 rounded-xl animate-in fade-in duration-200">
                        <div className="flex items-center gap-2.5 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-brand-blue-crayola shrink-0" />
                            <span>
                                Matched <strong>{linkedClient!.name}</strong>
                                {targetServiceKey && `. Enabling ${SERVICE_LABELS[targetServiceKey]} for them.`}
                            </span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={clearMatch}>
                            <X className="w-3 h-3" /> Not this client
                        </Button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ── Basic Info ─────────────────────────────────────────── */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Basic Info</CardTitle>
                            <CardDescription>Applies regardless of which automations are active.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditMode ? (
                                <div className="space-y-2">
                                    <Label htmlFor="client-name" className="text-sm font-semibold">
                                        Client Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="client-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="bg-background border-input"
                                    />
                                </div>
                            ) : (
                                <ClientNameField
                                    name={formData.name}
                                    onNameChange={(name) => {
                                        if (linkedClient) setLinkedClient(null);
                                        setFormData((prev) => ({ ...prev, name }));
                                    }}
                                    onMatchSelected={handleMatchSelected}
                                    disabled={isExtendingExisting}
                                />
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="client-industry" className="text-sm font-semibold">
                                    Industry <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="client-industry"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    placeholder="e.g. Dermatology, Digital Marketing"
                                    className="bg-background border-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="client-website" className="text-sm font-semibold">
                                    Website URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="client-website"
                                    type="url"
                                    value={formData.website_url}
                                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                    placeholder="https://www.clientwebsite.com"
                                    className="bg-background border-input"
                                />
                                <p className="text-xs text-muted-foreground/70">Auto-fills the website field on future content requests for this client.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Services ───────────────────────────────────────────── */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Active Services</CardTitle>
                            <CardDescription>Turn on the automations this client uses — each one reveals its own config below.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { key: 'content_enabled' as const, label: 'Content Briefs', icon: FileText, color: 'text-brand-blue-crayola' },
                                    { key: 'gbp_enabled' as const, label: 'GBP Posts', icon: MapPin, color: 'text-green-500' },
                                    { key: 'indexing_enabled' as const, label: 'Indexing', icon: Globe, color: 'text-purple-500' },
                                ].map(({ key, label, icon: Icon, color }) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-4 h-4 ${color}`} />
                                            <Label htmlFor={`toggle-${key}`} className="text-sm font-semibold cursor-pointer">
                                                {label}
                                            </Label>
                                        </div>
                                        <Switch
                                            id={`toggle-${key}`}
                                            checked={formData[key]}
                                            onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Content Briefs / GBP / Indexing config, ordered so whichever ──
                        automation you arrived to configure (defaultService) shows first ── */}
                    {sectionOrder.map((key) => sectionsByKey[key])}

                    {/* ── Actions ─────────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-3 pb-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(returnTo || '/settings/clients')}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !canSubmit}
                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isEditMode || isExtendingExisting ? 'Saving...' : 'Adding...'}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {isEditMode || isExtendingExisting ? 'Save Changes' : 'Add Client'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
