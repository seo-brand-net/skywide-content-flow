import { useAuth } from './useAuth';

export function useUserRole(userId?: string) {
    const { profile, loading, isProfileLoading, isInitialLoading } = useAuth();

    // Combined loading state
    const roleLoading = loading || isProfileLoading;

    // CRITICAL: If we are loading the role, we return null. 
    // This forces the Sidebar/UI to show skeletons instead of defaulting to 'user'.
    const userRole = profile?.role || (roleLoading ? null : 'user');
    const isAdmin = userRole === 'admin';
    const isResolved = !roleLoading && !!profile;

    return {
        userRole,
        isAdmin,
        loading: roleLoading,
        profileLoading: isProfileLoading,
        isInitialLoading,
        isResolved,
        roleLoading
    };
}
