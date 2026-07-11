"use client";

import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Loader2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface EditableClient {
    id: string;
    name: string;
    workbook_url: string | null;
    folder_url: string | null;
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

interface AddClientModalProps {
    onClientAdded: () => void;
    client?: EditableClient;
    trigger?: React.ReactNode;
}

const emptyFormData = {
    name: '',
    workbook_url: '',
    folder_url: '',
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

export function AddClientModal({ onClientAdded, client, trigger }: AddClientModalProps) {
    const isEditMode = !!client;
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState(client ? toFormData(client) : emptyFormData);

    // Re-sync form state if a different client is opened for editing, or the dialog re-opens.
    useEffect(() => {
        if (isOpen) {
            setFormData(client ? toFormData(client) : emptyFormData);
        }
    }, [isOpen, client]);

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
                workbook_url: formData.workbook_url || null,
                folder_url: formData.folder_url || null,
                folder_id: folderId || null,
                sitemap_url: formData.sitemap_url || null,
                industry: formData.industry || null,
                key_selling_point: formData.key_selling_point || null,
                content_enabled: formData.content_enabled,
                gbp_enabled: formData.gbp_enabled,
                indexing_enabled: formData.indexing_enabled,
                gbp_sheet_id: formData.gbp_enabled ? (formData.gbp_sheet_id || null) : null,
                gbp_topics_tab_name: formData.gbp_enabled ? (formData.gbp_topics_tab_name || 'Topics') : null,
                indexing_workbook_url: formData.indexing_enabled ? (formData.indexing_workbook_url || null) : null,
                indexing_tab_name: formData.indexing_enabled ? (formData.indexing_tab_name || 'Indexing Automation') : null,
                indexing_gsc_property: formData.indexing_enabled ? (formData.indexing_gsc_property || null) : null,
                indexing_bing_site_url: formData.indexing_enabled ? (formData.indexing_bing_site_url || null) : null,
            };

            const { error } = isEditMode
                ? await supabase.from('clients').update(payload).eq('id', client.id)
                : await supabase.from('clients').insert([payload]);

            if (error) throw error;

            toast({
                title: isEditMode ? "Client updated" : "Client added",
                description: `${formData.name} has been ${isEditMode ? 'updated' : 'added'} successfully.`,
            });

            setIsOpen(false);
            onClientAdded();
        } catch (error: any) {
            console.error('Error saving client:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to save client.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button className="flex items-center gap-2 bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold shadow-lg shadow-brand-blue-crayola/20 transition-all hover:scale-105">
                        <PlusCircle className="w-4 h-4" />
                        Add Client
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{isEditMode ? `Edit ${client!.name}` : 'Add New Client'}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure this client and choose which automations to enable.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="client-name" className="text-sm font-semibold">
                            Client Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="client-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Suncoast Skin Solutions"
                            required
                            className="bg-background border-input"
                        />
                    </div>

                    {/* Industry */}
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

                    {/* Key Selling Point */}
                    <div className="space-y-2">
                        <Label htmlFor="client-ksp" className="text-sm font-semibold">
                            Key Selling Point <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="client-ksp"
                            value={formData.key_selling_point}
                            onChange={(e) => setFormData({ ...formData, key_selling_point: e.target.value })}
                            placeholder="e.g. Board-certified dermatologists, 10 Florida locations"
                            className="bg-background border-input"
                        />
                        <p className="text-xs text-muted-foreground">Used by GBP automation to personalise post content.</p>
                    </div>

                    {/* Sitemap URL */}
                    <div className="space-y-2">
                        <Label htmlFor="client-sitemap" className="text-sm font-semibold">
                            Sitemap URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="client-sitemap"
                            value={formData.sitemap_url}
                            onChange={(e) => setFormData({ ...formData, sitemap_url: e.target.value })}
                            placeholder="https://example.com/page-sitemap.xml"
                            className="bg-background border-input"
                        />
                        <p className="text-xs text-muted-foreground">Used by GBP automation to pick the best internal link per post.</p>
                    </div>

                    {/* Workbook URL */}
                    <div className="space-y-2">
                        <Label htmlFor="client-workbook" className="text-sm font-semibold">
                            Workbook URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="client-workbook"
                            value={formData.workbook_url}
                            onChange={(e) => setFormData({ ...formData, workbook_url: e.target.value })}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="bg-background border-input"
                        />
                        <p className="text-xs text-muted-foreground">Content Briefs workbook — separate from the Indexing workbook below.</p>
                    </div>

                    {/* Drive Folder URL */}
                    <div className="space-y-2">
                        <Label htmlFor="client-folder" className="text-sm font-semibold">
                            Drive Folder URL <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="client-folder"
                            value={formData.folder_url}
                            onChange={(e) => setFormData({ ...formData, folder_url: e.target.value })}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="bg-background border-input"
                        />
                    </div>

                    {/* Service Toggles */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Active Services</Label>
                        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 flex-wrap">
                            {[
                                { key: 'content_enabled', label: 'Content Briefs', color: 'text-brand-blue-crayola' },
                                { key: 'gbp_enabled', label: 'GBP Posts', color: 'text-green-500' },
                                { key: 'indexing_enabled', label: 'Indexing', color: 'text-purple-500' },
                            ].map(({ key, label, color }) => (
                                <div key={key} className="flex items-center gap-2.5">
                                    <Switch
                                        id={`toggle-${key}`}
                                        checked={formData[key as keyof typeof formData] as boolean}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, [key]: checked })
                                        }
                                    />
                                    <Label htmlFor={`toggle-${key}`} className={`text-sm font-medium cursor-pointer ${color}`}>
                                        {label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/50">
                            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Locations for multi-location clients (e.g. Suncoast) can be added after saving.
                            </p>
                        </div>
                    </div>

                    {/* GBP config (shown when GBP is enabled) */}
                    {formData.gbp_enabled && (
                        <div className="space-y-3 p-4 bg-green-500/5 rounded-xl border border-green-500/20 animate-in fade-in duration-200">
                            <Label className="text-sm font-semibold text-green-600">GBP Config</Label>
                            <div className="space-y-2">
                                <Label htmlFor="client-gbp-sheet" className="text-xs font-semibold">Google Sheet ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                <Input
                                    id="client-gbp-sheet"
                                    value={formData.gbp_sheet_id}
                                    onChange={(e) => setFormData({ ...formData, gbp_sheet_id: e.target.value })}
                                    placeholder="1xh0As6rrHv9WqCDqfgUyvJm8WCPvLf1Hks5RFf-Sf0A"
                                    className="bg-background border-input h-9 text-sm"
                                />
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
                        </div>
                    )}

                    {/* Indexing config (shown when Indexing is enabled) */}
                    {formData.indexing_enabled && (
                        <div className="space-y-3 p-4 bg-purple-500/5 rounded-xl border border-purple-500/20 animate-in fade-in duration-200">
                            <Label className="text-sm font-semibold text-purple-600">Indexing Config</Label>
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
                                <Label htmlFor="client-idx-bing" className="text-xs font-semibold">Bing Site URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                <Input
                                    id="client-idx-bing"
                                    value={formData.indexing_bing_site_url}
                                    onChange={(e) => setFormData({ ...formData, indexing_bing_site_url: e.target.value })}
                                    placeholder="https://example.com"
                                    className="bg-background border-input h-9 text-sm"
                                />
                                <p className="text-xs text-muted-foreground">Leave blank to skip Bing indexing for this client.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                !formData.name ||
                                (formData.indexing_enabled && (!formData.indexing_workbook_url || !formData.indexing_gsc_property))
                            }
                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isEditMode ? 'Saving...' : 'Adding...'}
                                </>
                            ) : (
                                isEditMode ? 'Save Changes' : 'Add Client'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
