"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordReset: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check for existing password reset state
    const storedResetState = sessionStorage.getItem('isPasswordReset');
    if (storedResetState === 'true') {
      setIsPasswordReset(true);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Check if this is a password reset flow
        const urlParams = new URLSearchParams(window.location.search);
        const isResetFlow = urlParams.get('type') === 'recovery' || event === 'PASSWORD_RECOVERY';

        if (isResetFlow && session) {
          // Handle password reset - set session but don't treat as regular login
          setSession(session);
          setUser(null); // Don't set user to prevent auto-login behavior
          setIsPasswordReset(true);
          sessionStorage.setItem('isPasswordReset', 'true');
        } else if (event === 'SIGNED_OUT') {
          // Handle sign out
          setSession(null);
          setUser(null);
          setIsPasswordReset(false);
          sessionStorage.removeItem('isPasswordReset');
          router.push('/login');
        } else if (!isPasswordReset) {
          // Regular authentication flow (only if not in password reset mode)
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const urlParams = new URLSearchParams(window.location.search);
      const isResetFlow = urlParams.get('type') === 'recovery';
      const storedResetState = sessionStorage.getItem('isPasswordReset') === 'true';

      if ((isResetFlow || storedResetState) && session) {
        setSession(session);
        setUser(null);
        setIsPasswordReset(true);
        sessionStorage.setItem('isPasswordReset', 'true');
      } else if (!storedResetState) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsPasswordReset(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

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
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
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
      // Perform full sign out to clear cookies
      await supabase.auth.signOut();

      // Clear local state
      setSession(null);
      setUser(null);

      // Clear any legacy auth data
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-sgwocrvftiwxofvykmhh-auth-token');

      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });

      router.push('/login');
    } catch (error: any) {
      // Force cleanup even on error
      setSession(null);
      setUser(null);
      router.push('/login');

      toast({
        title: "Signed Out",
        description: "You have been signed out.",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset Email Sent",
          description: "Check your email for password reset instructions.",
        });
      }

      return { error };
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
        // Clear password reset state and establish proper session
        setIsPasswordReset(false);
        setUser(session?.user ?? null);
        sessionStorage.removeItem('isPasswordReset');

        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
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
    loading,
    isPasswordReset,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
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