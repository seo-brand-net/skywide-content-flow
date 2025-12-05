import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isPasswordReset } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const toastShownForPath = useRef<string | null>(null);

  // Show toast when redirecting unauthenticated users or when session is expired/invalid
  useEffect(() => {
    // Reset toast flag when user becomes authenticated
    if (user) {
      toastShownForPath.current = null;
      return;
    }

    // Show toast if:
    // - Not loading
    // - User is not authenticated (either no user or expired/invalid session)
    // - Not in password reset flow
    // - Not already on login page
    // - Haven't shown toast for this path yet
    if (
      !loading && 
      !user && 
      !isPasswordReset && 
      location.pathname !== '/login' &&
      toastShownForPath.current !== location.pathname
    ) {
      toastShownForPath.current = location.pathname;
      toast({
        description: "Please log in to continue.",
      });
    }
  }, [loading, user, isPasswordReset, location.pathname, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow access to reset password page during password reset flow
  if (isPasswordReset && location.pathname === '/reset-password') {
    return <>{children}</>;
  }

  // Prevent access to other protected routes during password reset
  if (isPasswordReset && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}