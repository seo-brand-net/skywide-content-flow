"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './useAuth';

export interface WorkbookRow {
    id: string;
    primary_keyword: string;
    secondary_keyword: string | null;
    page_type: string;
    url: string | null;
    status: string;
    brief_url: string | null;
    brief_data: any | null;
    intent: string | null;
    location: string | null;
    longtail_keywords: string | null;
    created_at: string;
    updated_at: string;
    client_id: string;
    user_id: string | null;
    clients: {
        name: string;
        workbook_url: string;
    } | null;
    profiles: {
        full_name: string;
        email: string;
    } | null;
    notes: string | null;
}

export function useWorkbookRows(options: {
    currentPage: number;
    pageSize: number;
    statusFilter: string;
    userRole: string | null;
    userId: string | undefined;
    enabled: boolean;
}) {
    const { currentPage, pageSize, statusFilter, userRole, userId, enabled } = options;
    const { authError } = useAuth();
    const supabase = createClient();

    const queryKey = ['workbook_rows', { currentPage, pageSize, statusFilter, userRole, userId }];
    const isActuallyEnabled = enabled && !!userRole && (userRole === 'admin' || !!userId) && !authError;

    return useQuery({
        queryKey,
        queryFn: async () => {
            console.log('[useWorkbookRows] 🔍 Fetching...', {
                statusFilter,
                userRole,
                userId,
                currentPage,
                pageSize
            });
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('workbook_rows')
                .select(`
                    *,
                    clients (
                        name,
                        workbook_url
                    ),
                    profiles:user_id (
                        full_name,
                        email
                    )
                `, { count: 'exact' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (userRole !== 'admin') {
                query = query.eq('user_id', userId);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error('[useWorkbookRows] ❌ Supabase Fetch Error:', error.message, error.code);
                throw error;
            }

            console.log(`[useWorkbookRows] ✅ Fetch resolved (${data?.length || 0} rows)`);
            return { rows: (data as any) as WorkbookRow[], totalCount: count || 0 };
        },
        enabled: isActuallyEnabled,
        placeholderData: (previousData) => {
            if (!isActuallyEnabled && previousData) {
                console.log('[useWorkbookRows] ⏸️ Query disabled/blocked, providing cached placeholderData', { authError });
            }
            return previousData;
        },
        staleTime: 1000 * 30, // 30 seconds
    });
}
