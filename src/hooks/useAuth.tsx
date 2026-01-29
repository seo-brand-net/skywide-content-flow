"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  displayName: string | null;
  loading: boolean;
  isInitialLoading: boolean;
  isProfileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  isPasswordReset: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
  initialSession = null
}: {
  children: ReactNode,
  initialUser?: User | null,
  initialSession?: Session | null
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(!initialSession);
  const [isProfileLoading, setIsProfileLoading] = useState(!!initialSession);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    // Only show loading state if we don't have a profile yet to prevent focus-induced flickering
    if (!profile) setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    console.log('[Auth] 🔐 Initializing auth listener');

    // 1. Initial manual check to ensure sync
    const checkInitialSession = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (currentSession) {
        console.log('[Auth] Found existing session on mount');
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchProfile(currentSession.user.id);
      }
      setLoading(false);
      setIsInitialLoading(false);
    };
    checkInitialSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[Auth] 🔄 Event received: ${event}`);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setIsProfileLoading(false);
        }

        setLoading(false);
        setIsInitialLoading(false);

        if (event === 'SIGNED_IN') {
          setIsPasswordReset(false);
        } else if (event === 'SIGNED_OUT') {
          setIsPasswordReset(false);
          // Only redirect if we are on a protected route
          // This prevents infinite loops if login page itself triggers a mount event
          const protectedPaths = [
            '/dashboard',
            '/research',
            '/content-briefs',
            '/my-requests',
            '/ai-rewriter',
            '/features',
            '/analytics',
            '/settings'
          ];
          const isProtected = protectedPaths.some(p => window.location.pathname.startsWith(p));

          if (isProtected) {
            console.log('[Auth] 🚪 User signed out, redirecting to login');
            router.push('/login');
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordReset(true);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] ✨ Token refreshed successfully');
        } else if (event === 'INITIAL_SESSION') {
          console.log('[Auth] 🔑 Initial session established');
        }
      }
    );

    // 3. Keep-alive Heartbeat (proactively refresh session every 10 mins)
    const heartbeat = setInterval(async () => {
      if (session) {
        console.log('[Auth] 💓 Heartbeat: Checking session health...');
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('[Auth] Heartbeat error:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(heartbeat);
    };
  }, [supabase, router]);

  const displayName = user ? (
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email
  ) : null;

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        router.push('/dashboard');
        router.refresh();
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName || email.split('@')[0],
          }
        }
      });

      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Sign Up Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });

      // Clear local state immediately
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsProfileLoading(false);

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Use hard navigation for logout to clear memory contexts and ensure instant redirection
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        title: "Sign Out Error",
        description: "An error occurred during sign out.",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Use the custom branded email via API route
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          resetUrl: `${window.location.origin}/auth/callback?next=/update-password`,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Reset Failed",
          description: data.error || "Could not send reset email.",
          variant: "destructive",
        });
        return { error: new Error(data.error) };
      } else {
        toast({
          title: "Reset Email Sent",
          description: "Check your email for custom password reset instructions.",
        });
      }

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Reset Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: "Password Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
        router.push('/dashboard');
        router.refresh();
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Update Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    displayName,
    loading,
    isProfileLoading,
    isInitialLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isPasswordReset,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}