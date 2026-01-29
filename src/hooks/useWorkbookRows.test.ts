import { renderHook, waitFor } from '@testing-library/react';
import { useWorkbookRows } from './useWorkbookRows';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('@/utils/supabase/client');
jest.mock('./useAuth');

const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
};

describe('useWorkbookRows', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        jest.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        (useAuth as jest.Mock).mockReturnValue({ authError: null });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client= { queryClient } > { children } </QueryClientProvider>
    );

it('successfully fetches rows for admin', async () => {
    const mockData = [
        { id: '1', primary_keyword: 'test', status: 'DONE' }
    ];

    mockSupabase.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
        count: 1
    });

    const { result } = renderHook(() => useWorkbookRows({
        currentPage: 1,
        pageSize: 10,
        statusFilter: 'all',
        userRole: 'admin',
        userId: 'admin-id',
        enabled: true
    }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.rows).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith('workbook_rows');
    // Admin should not have userId filter
    expect(mockSupabase.eq).not.toHaveBeenCalledWith('user_id', expect.anything());
});

it('filters by userId for non-admin users', async () => {
    mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
    });

    renderHook(() => useWorkbookRows({
        currentPage: 1,
        pageSize: 10,
        statusFilter: 'all',
        userRole: 'user',
        userId: 'user-id',
        enabled: true
    }), { wrapper });

    await waitFor(() => {
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-id');
    });
});

it('filters by status when statusFilter is not "all"', async () => {
    mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
    });

    renderHook(() => useWorkbookRows({
        currentPage: 1,
        pageSize: 10,
        statusFilter: 'DONE',
        userRole: 'admin',
        userId: 'admin-id',
        enabled: true
    }), { wrapper });

    await waitFor(() => {
        expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'DONE');
    });
});

it('is disabled when enabled prop is false', () => {
    const { result } = renderHook(() => useWorkbookRows({
        currentPage: 1,
        pageSize: 10,
        statusFilter: 'all',
        userRole: 'admin',
        userId: 'admin-id',
        enabled: false
    }), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockSupabase.from).not.toHaveBeenCalled();
});

it('is disabled when authError is present', () => {
    (useAuth as jest.Mock).mockReturnValue({ authError: 'Some error' });

    const { result } = renderHook(() => useWorkbookRows({
        currentPage: 1,
        pageSize: 10,
        statusFilter: 'all',
        userRole: 'admin',
        userId: 'admin-id',
        enabled: true
    }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
});
});
