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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface GbpClient {
    id: string;
    name: string;
}

interface AddTopicsModalProps {
    clients: GbpClient[];
    defaultClientId?: string;
    onTopicsAdded: () => void;
}

export function AddTopicsModal({ clients, defaultClientId, onTopicsAdded }: AddTopicsModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [selectedClientId, setSelectedClientId] = useState(defaultClientId || '');
    const [topicsText, setTopicsText] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId || !topicsText.trim()) return;

        const lines = topicsText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length === 0) return;

        setIsSubmitting(true);
        try {
            const rows = lines.map(topic => ({
                gbp_client_id: selectedClientId,
                topic,
                status: 'NEW',
            }));

            const { error } = await supabase.from('gbp_topics').insert(rows);
            if (error) throw error;

            toast({
                title: "Topics Added",
                description: `${lines.length} topic${lines.length === 1 ? '' : 's'} added to the queue.`,
            });

            setTopicsText('');
            setIsOpen(false);
            onTopicsAdded();
        } catch (error: any) {
            console.error('Error adding topics:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to add topics.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const lineCount = topicsText.split('\n').filter(l => l.trim()).length;
    const isValid = selectedClientId && topicsText.trim();

    return (
        <>
            <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setIsOpen(true)}
            >
                <PlusCircle className="w-4 h-4" />
                Add Topics
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[540px] bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add Topics to Queue</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Paste one topic per line. All topics will be queued as NEW.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5 py-2">
                        {/* Client Selector */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Client <span className="text-destructive">*</span>
                            </Label>
                            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                <SelectTrigger className="bg-background border-input">
                                    <SelectValue placeholder="Select a GBP client..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Topics Textarea */}
                        <div className="space-y-2">
                            <Label htmlFor="topics-text" className="text-sm font-semibold">
                                Topics <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="topics-text"
                                value={topicsText}
                                onChange={(e) => setTopicsText(e.target.value)}
                                placeholder={`SEO tips for Boca Raton businesses to get more leads\nWhat local SEO is and why it matters for service businesses\nHow to tell if your website is costing you leads`}
                                className="bg-background border-input resize-none h-40 font-mono text-sm"
                            />
                            {lineCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {lineCount} topic{lineCount === 1 ? '' : 's'} detected
                                </p>
                            )}
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
                                disabled={isSubmitting || !isValid}
                                className="bg-brand-blue-crayola text-white hover:bg-brand-blue-crayola/90"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    `Add ${lineCount > 0 ? lineCount : ''} Topic${lineCount === 1 ? '' : 's'}`
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
