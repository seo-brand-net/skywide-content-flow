import { useAuth } from './useAuth';

export function useUserRole(userId?: string) {
    const { profile, loading, isProfileLoading, isInitialLoading } = useAuth();

    // If we are loading, we don't know the role yet.
    // Defaulting to 'user' while loading can cause flickering/redirect loops for admins.
    const userRole = (loading || isProfileLoading) ? null : (profile?.role || 'user');
    const isAdmin = userRole === 'admin';
    const isResolved = !loading && !isProfileLoading && !!profile;

    return {
        userRole,
        isAdmin,
        loading: loading || isProfileLoading,
        profileLoading: isProfileLoading,
        isInitialLoading,
        isResolved,
        roleLoading: loading || isProfileLoading,
        isRolePending: loading || isProfileLoading
    };
}
