"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './useAuth';

export interface ContentRequest {
    id: string;
    article_title: string;
    title_audience: string;
    seo_keywords: string;
    article_type: string;
    client_name: string;
    creative_brief: string;
    status: string;
    created_at: string;
    updated_at: string;
    webhook_sent: boolean | null;
    webhook_response: string | null;
    user_id: string;
    current_run_id: string | null;
    profiles?: {
        full_name: string;
        email: string;
        role: string;
    };
}

export function useContentRequests(options: {
    currentPage: number;
    pageSize: number;
    userRole: string | null;
    userId: string | undefined;
    enabled: boolean;
}) {
    const { currentPage, pageSize, userRole, userId, enabled } = options;
    const { authError } = useAuth();
    const supabase = createClient();

    const queryKey = ['content_requests', { currentPage, pageSize, userRole, userId }];
    const isActuallyEnabled = enabled && !!userRole && (userRole === 'admin' || !!userId) && !authError;

    return useQuery({
        queryKey,
        queryFn: async () => {
            console.log('[useContentRequests] 🔍 Fetching...', {
                userRole,
                userId,
                currentPage,
                from: (currentPage - 1) * pageSize,
                to: (currentPage - 1) * pageSize + pageSize - 1
            });
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;

            let result;
            if (userRole === 'admin') {
                result = await supabase
                    .from('content_requests')
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(from, to);
            } else {
                result = await supabase
                    .from('content_requests')
                    .select('*', { count: 'exact' })
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .range(from, to);
            }

            const { data, error, count } = result;

            if (error) {
                console.error('[useContentRequests] ❌ Supabase Fetch Error:', error.message, error.code);
                throw error;
            }

            // Fetch profiles for admins if needed
            if (userRole === 'admin' && data && data.length > 0) {
                const userIds = [...new Set(data.map((req: any) => req.user_id))];
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role')
                    .in('id', userIds);

                if (profilesError) {
                    console.error('[useContentRequests] ⚠️ Profiles Fetch Error:', profilesError.message);
                    return { requests: data as ContentRequest[], totalCount: count || 0 };
                }

                const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
                const requestsWithProfiles = data.map((req: any) => ({
                    ...req,
                    profiles: profilesMap.get(req.user_id) || undefined
                }));

                console.log('[useContentRequests] ✅ Admin fetch resolved with profiles');
                return { requests: requestsWithProfiles as ContentRequest[], totalCount: count || 0 };
            }

            console.log(`[useContentRequests] ✅ Fetch resolved (${data?.length || 0} rows)`);
            return { requests: (data || []) as ContentRequest[], totalCount: count || 0 };
        },
        enabled: isActuallyEnabled,
        placeholderData: (previousData) => {
            if (!isActuallyEnabled && previousData) {
                console.log('[useContentRequests] ⏸️ Query disabled/blocked, providing cached placeholderData', { authError });
            }
            return previousData;
        },
        staleTime: 1000 * 30, // 30 seconds
    });
}
