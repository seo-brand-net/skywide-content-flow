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
import { PlusCircle, Loader2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AddIndexingClientModalProps {
    onClientAdded: () => void;
}

export function AddIndexingClientModal({ onClientAdded }: AddIndexingClientModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        workbook_url: '',
        tab_name: 'Indexing Automation',
        gsc_property: '',
        bing_site_url: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.workbook_url || !formData.gsc_property) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('indexing_clients')
                .insert([{
                    name: formData.name,
                    workbook_url: formData.workbook_url,
                    tab_name: formData.tab_name || 'Indexing Automation',
                    gsc_property: formData.gsc_property,
                    bing_site_url: formData.bing_site_url || null
                }]);

            if (error) throw error;

            toast({
                title: "Client Added",
                description: `${formData.name} has been added to indexing clients.`,
            });

            setFormData({
                name: '',
                workbook_url: '',
                tab_name: 'Indexing Automation',
                gsc_property: '',
                bing_site_url: ''
            });
            setIsOpen(false);
            onClientAdded();
        } catch (error: any) {
            console.error('Error adding indexing client:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to add indexing client.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Add Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Add Indexing Client</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure a new client for automated URL indexing via Google &amp; Bing.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="idx-name" className="text-sm font-semibold">
                            Client Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="idx-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. AgriBilt"
                            required
                            className="bg-background border-input"
                        />
                    </div>

                    {/* Workbook URL */}
                    <div className="space-y-2">
                        <Label htmlFor="idx-workbook" className="text-sm font-semibold">
                            Workbook URL <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="idx-workbook"
                            value={formData.workbook_url}
                            onChange={(e) => setFormData({ ...formData, workbook_url: e.target.value })}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            required
                            className="bg-background border-input"
                        />
                        <p className="text-xs text-muted-foreground">
                            URL pointing to the Indexing Automation tab (different gid than Content Briefs).
                        </p>
                    </div>

                    {/* Tab Name */}
                    <div className="space-y-2">
                        <Label htmlFor="idx-tab" className="text-sm font-semibold">
                            Tab Name
                        </Label>
                        <Input
                            id="idx-tab"
                            value={formData.tab_name}
                            onChange={(e) => setFormData({ ...formData, tab_name: e.target.value })}
                            placeholder="Indexing Automation"
                            className="bg-background border-input"
                        />
                    </div>

                    {/* GSC Property */}
                    <div className="space-y-2">
                        <Label htmlFor="idx-gsc" className="text-sm font-semibold">
                            GSC Property <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="idx-gsc"
                            value={formData.gsc_property}
                            onChange={(e) => setFormData({ ...formData, gsc_property: e.target.value })}
                            placeholder="https://agribilt.com/ or sc-domain:agribilt.com"
                            required
                            className="bg-background border-input"
                        />
                        <div className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/50">
                            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Use the exact format from Google Search Console:{' '}
                                <code className="bg-muted px-1 rounded text-[10px]">https://example.com/</code>{' '}
                                for URL-prefix properties, or{' '}
                                <code className="bg-muted px-1 rounded text-[10px]">sc-domain:example.com</code>{' '}
                                for domain properties.
                            </p>
                        </div>
                    </div>

                    {/* Bing Site URL */}
                    <div className="space-y-2">
                        <Label htmlFor="idx-bing" className="text-sm font-semibold">
                            Bing Site URL{' '}
                            <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="idx-bing"
                            value={formData.bing_site_url}
                            onChange={(e) => setFormData({ ...formData, bing_site_url: e.target.value })}
                            placeholder="https://agribilt.com"
                            className="bg-background border-input"
                        />
                        <p className="text-xs text-muted-foreground">
                            Leave blank to skip Bing indexing for this client.
                        </p>
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
                            disabled={isSubmitting || !formData.name || !formData.workbook_url || !formData.gsc_property}
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
