"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

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
    const supabase = createClient();

    return useQuery({
        queryKey: ['content_requests', { currentPage, pageSize, userRole, userId }],
        queryFn: async () => {
            console.log('[useContentRequests] Fetching...', { userRole, currentPage, pageSize });
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;

            if (userRole === 'admin') {
                const { data, error, count } = await supabase
                    .from('content_requests')
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;

                // Fetch profiles for admins
                if (data && data.length > 0) {
                    const userIds = [...new Set(data.map((req: any) => req.user_id))];
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, role')
                        .in('id', userIds);

                    if (profilesError) {
                        console.error('Error fetching profiles:', profilesError);
                        return { requests: data as ContentRequest[], totalCount: count || 0 };
                    }

                    const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
                    const requestsWithProfiles = data.map((req: any) => ({
                        ...req,
                        profiles: profilesMap.get(req.user_id) || undefined
                    }));

                    return { requests: requestsWithProfiles as ContentRequest[], totalCount: count || 0 };
                }
                return { requests: [], totalCount: 0 };
            } else {
                const { data, error, count } = await supabase
                    .from('content_requests')
                    .select('*', { count: 'exact' })
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;
                return { requests: (data || []) as ContentRequest[], totalCount: count || 0 };
            }
        },
        enabled: enabled && !!userRole && (userRole === 'admin' || !!userId),
        placeholderData: (previousData) => previousData, // keepPreviousData replacement in v5
        staleTime: 1000 * 30, // 30 seconds
    });
}
