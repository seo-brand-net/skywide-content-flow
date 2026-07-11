"use client";

import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ClientForm, type EditableClient } from '@/components/clients/ClientForm';

export default function EditClientPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const { userRole, isInitialLoading } = useUserRole(user?.id);

    const { data: client, isLoading: isLoadingClient, isError } = useQuery({
        queryKey: ['client_edit', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, industry, sitemap_url, key_selling_point, workbook_url, folder_url, content_enabled, gbp_enabled, indexing_enabled, gbp_sheet_id, gbp_topics_tab_name, indexing_workbook_url, indexing_tab_name, indexing_gsc_property, indexing_bing_site_url')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as EditableClient;
        },
        enabled: !!user?.id && userRole === 'admin',
    });

    if (isInitialLoading || (userRole === 'admin' && isLoadingClient)) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </div>
        );
    }

    if (userRole !== 'admin') {
        return (
            <div className="min-h-screen bg-background p-8 flex items-center justify-center">
                <div className="text-center space-y-3 opacity-60">
                    <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">Admin access required</p>
                    <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
                </div>
            </div>
        );
    }

    if (isError || !client) {
        return (
            <div className="min-h-screen bg-background p-8 flex items-center justify-center">
                <div className="text-center space-y-3 opacity-60">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">Client not found</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/settings/clients')}>
                        Back to Client Management
                    </Button>
                </div>
            </div>
        );
    }

    return <ClientForm client={client} />;
}
