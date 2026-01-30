"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
  initialSession = null,
  initialProfile = null
}: {
  children: ReactNode,
  initialUser?: User | null,
  initialSession?: Session | null,
  initialProfile?: any | null
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<any | null>(initialProfile);
  const [loading, setLoading] = useState(!initialSession);
  const [isProfileLoading, setIsProfileLoading] = useState(!!initialSession && !initialProfile);
  const [isInitialLoading, setIsInitialLoading] = useState(!initialProfile);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Memoize supabase client to prevent unnecessary useEffect re-runs
  const supabase = useMemo(() => createClient(), []);

  const hasLoadedProfile = useRef(false);
  const sessionRef = useRef<Session | null>(initialSession);

  const fetchProfile = async (userId: string, force = false) => {
    if (!userId) {
      setIsProfileLoading(false);
      return;
    }

    // Skip if already loading and not forced
    if (isProfileLoading && !force) return;

    // Only show loading state if we don't have a profile yet or it's forced
    if (!profile || force) setIsProfileLoading(true);
    setAuthError(null);

    try {
      console.log(`[Auth] 📋 Fetching profile for ${userId} (force: ${force})...`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        console.log('[Auth] ✅ Profile resolved:', data.email, data.role);
        setProfile(data);
        hasLoadedProfile.current = true;
      } else if (error) {
        // Handle specific case where profile doesn't exist yet
        if (error.code === 'PGRST116') {
          console.warn('[Auth] ⚠️ Profile not found in database. Using user defaults.');
          // Don't set authError here, useUserRole will handle the fallback
        } else {
          console.error('[Auth] ❌ Profile fetch error:', error.message);
          setAuthError(`Profile resolution failed: ${error.message}`);
        }
      }
    } catch (e) {
      console.error('[Auth] ❌ Unexpected profile error:', e);
    } finally {
      setIsProfileLoading(false);
      setIsInitialLoading(false);
    }
  };


  useEffect(() => {
    const isMounted = { current: true };
    console.log('[Auth] 🔐 Initializing auth listener');

    // 1. Initial manual check to ensure sync
    const checkInitialSession = async () => {
      try {
        if (!isMounted.current) return;
        console.log('[Auth] 🔍 Checking initial session...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] ❌ Session check error:', error);
          if (error.message?.includes('refresh_token_not_found')) {
            localStorage.clear();
          }
        }

        const activeSession = currentSession || session;
        const activeUser = activeSession?.user || user;

        setSession(activeSession);
        sessionRef.current = activeSession;
        setUser(activeUser);

        // If we don't have a profile yet but we have a user, fetch it
        if (activeUser && !profile) {
          console.log('[Auth] Fetching profile on mount (missing initial profile)');
          await fetchProfile(activeUser.id);
        } else if (activeUser && profile) {
          console.log('[Auth] Using hydrated profile from server');
          setIsProfileLoading(false);
        } else {
          console.log('[Auth] No session found during initial check');
          setIsProfileLoading(false);
        }
      } catch (e) {
        console.error('[Auth] Critical initialization error:', e);
      } finally {
        setLoading(false);
        setIsInitialLoading(false);
      }
    };
    checkInitialSession();


    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, currentSession: any) => {
        if (!isMounted.current) return;

        console.log(`[Auth] 🔄 Event received: ${event}`);

        // IGNORE null events on INITIAL_SESSION if we already have a session from the manual check
        const isStaleInitialization = !currentSession && event === 'INITIAL_SESSION' && sessionRef.current;

        if (isStaleInitialization) {
          console.log('[Auth] 🛡️ Guard: Ignoring stale null initialization');
        } else {
          setSession(currentSession);
          sessionRef.current = currentSession;
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            if (event === 'TOKEN_REFRESHED') {
              console.log('[Auth] 🔑 Token refreshed. Refreshing data...');
              queryClient.invalidateQueries();
            }
            await fetchProfile(currentSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setIsProfileLoading(false);

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
              console.log('[Auth] 🚪 Redirecting to login...');
              router.push('/login');
            }
          }
        }

        setLoading(false);
        setIsInitialLoading(false);
      }
    )

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
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

  const queryClient = useQueryClient();

  const signOut = async () => {
    console.log('[Auth] 🚪 Starting signOut process for:', user?.email);

    try {
      // 1. Immediate UI Feedback
      toast({
        title: "Signing out...",
        description: "Clearing your session securely.",
      });

      // 2. Clear local state and cache first
      queryClient.clear();
      setUser(null);
      setSession(null);
      setProfile(null);
      sessionRef.current = null;
      setAuthError(null);

      // 3. Parallel sign out across layers with a shorter timeout
      console.log('[Auth] 🌐 Performing multi-layer sign out...');
      const apiPromise = fetch('/api/auth/sign-out', { method: 'POST' });
      const localSignOutPromise = supabase.auth.signOut();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 1200)
      );

      // We wait for the first resolution or timeout
      await Promise.race([
        Promise.all([apiPromise, localSignOutPromise]),
        timeoutPromise
      ]);

      console.log('[Auth] ✅ Sign out process finished (or timed out)');

      // 4. Perform hard navigation to destroy all memory context
      window.location.replace('/login');
    } catch (error: any) {
      console.error('[Auth] ❌ Error in signOut process:', error.message);
      window.location.replace('/login');
    }
  };

  const setAuthErrorManual = (msg: string | null) => setAuthError(msg);

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
    authError,
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