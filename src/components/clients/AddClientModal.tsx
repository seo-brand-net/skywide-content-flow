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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
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
        folder_url: ''
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
                    workbook_url: formData.workbook_url,
                    folder_url: formData.folder_url,
                    folder_id: folderId
                }]);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Client added successfully.",
            });
            setFormData({ name: '', workbook_url: '', folder_url: '' });
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
                <Button variant="outline" className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Add Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="seobrand-subtitle">Add New Client</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Client Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. SEO Brand"
                            required
                            className="bg-background border-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="workbook">Workbook URL</Label>
                        <Input
                            id="workbook"
                            value={formData.workbook_url}
                            onChange={(e) => setFormData({ ...formData, workbook_url: e.target.value })}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="bg-background border-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="folder">Drive Folder URL</Label>
                        <Input
                            id="folder"
                            value={formData.folder_url}
                            onChange={(e) => setFormData({ ...formData, folder_url: e.target.value })}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="bg-background border-input"
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-blue-crayola text-white">
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
