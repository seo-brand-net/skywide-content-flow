import { useAuth } from './useAuth';

export function useUserRole(userId?: string) {
    const { profile, loading, isProfileLoading, isInitialLoading, authError, user } = useAuth();

    // If we have a user but no profile yet, assume 'user' role to allow initial fetches.
    // This prevents queries from being disabled while waiting for the profile fetch.
    const userRole = profile?.role || (user ? 'user' : null);
    const isAdmin = userRole === 'admin';
    const isResolved = !loading && !isProfileLoading && !!profile;

    return {
        userRole,
        isAdmin,
        loading: loading || isProfileLoading,
        profileLoading: isProfileLoading,
        isInitialLoading,
        isResolved,
        authError,
        roleLoading: loading || isProfileLoading,
        isRolePending: loading || isProfileLoading
    };
}
