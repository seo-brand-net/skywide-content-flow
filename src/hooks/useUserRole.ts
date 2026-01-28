import { useAuth } from './useAuth';

export function useUserRole(userId?: string) {
    const { profile, loading } = useAuth();

    // If we have a profile, use its role, otherwise default to 'user'
    // profile.role is expected to be 'admin', 'user', etc.
    const userRole = profile?.role || 'user';
    const isAdmin = userRole === 'admin';

    return {
        userRole,
        isAdmin,
        loading
    };
}
