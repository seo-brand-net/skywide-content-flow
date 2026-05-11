"use client";

import { useState } from 'react';
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

interface AddClientModalProps {
    onClientAdded: () => void;
}

export function AddClientModal({ onClientAdded }: AddClientModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        workbook_url: '',
        folder_url: '',
        sitemap_url: '',
        industry: '',
        key_selling_point: '',
        content_enabled: true,
        gbp_enabled: false,
        indexing_enabled: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSubmitting(true);
        try {
            let folderId = '';
            if (formData.folder_url.includes('/folders/')) {
                folderId = formData.folder_url.split('/folders/')[1].split('?')[0];
            }

            const { error } = await supabase
                .from('clients')
                .insert([{
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
                }]);

            if (error) throw error;

            toast({
                title: "Client added",
                description: `${formData.name} has been added successfully.`,
            });

            setFormData({
                name: '',
                workbook_url: '',
                folder_url: '',
                sitemap_url: '',
                industry: '',
                key_selling_point: '',
                content_enabled: true,
                gbp_enabled: false,
                indexing_enabled: false,
            });
            setIsOpen(false);
            onClientAdded();
        } catch (error: any) {
            console.error('Error adding client:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to add client.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90 font-bold shadow-lg shadow-brand-blue-crayola/20 transition-all hover:scale-105">
                    <PlusCircle className="w-4 h-4" />
                    Add Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Add New Client</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure a new client and choose which automations to enable.
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
                            disabled={isSubmitting || !formData.name}
                            className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Client'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
