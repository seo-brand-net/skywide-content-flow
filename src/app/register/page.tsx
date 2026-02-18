"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useInvitationToken } from '@/hooks/useInvitationToken';
import { RegistrationForm } from '@/components/registration/RegistrationForm';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AuthLayout } from '@/components/auth/AuthLayout';

interface RegistrationFormData {
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
}

function RegisterContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, session } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const token = searchParams.get('token');
    const { invitation: dbInvitation, loading, error } = useInvitationToken(token);

    // Only construct a synthetic invitation if the user is logged in AND arrived via an invite token.
    // Without a token, even authenticated users must not bypass the invitation gate.
    const invitation: any = (user && token) ? {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        role: user.user_metadata?.role || 'user',
        status: 'accepted',
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        token: token
    } : dbInvitation;

    const handleRegistration = async (formData: RegistrationFormData) => {
        if (!invitation) return;

        setIsSubmitting(true);

        try {
            if (user) {
                // If user is already authenticated (via native invite callback)
                // Just update their password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: formData.password
                });

                if (updateError) throw updateError;

                toast({
                    title: "Registration Complete!",
                    description: "Your account is now fully set up. Welcome to SKYWIDE!",
                });

                router.push('/dashboard');
            } else {
                // Fallback for old/manual token-based registration if no session exists
                if (!token) throw new Error('No invitation token found');

                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: invitation.email,
                        password: formData.password,
                        role: (invitation as any).role,
                        fullName: (invitation as any).full_name,
                        token: token
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 409) {
                        toast({
                            title: "Account Already Exists",
                            description: "An account with this email already exists. Please sign in instead.",
                            variant: "destructive",
                        });
                        router.push('/login');
                        return;
                    }
                    throw new Error(data.error || 'Registration failed');
                }

                toast({
                    title: "Account Created Successfully!",
                    description: `Welcome to SKYWIDE! You can now sign in.`,
                });

                router.push('/login');
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            toast({
                title: "Registration Failed",
                description: error.message || 'Failed to complete registration.',
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Guard: once auth has settled, a logged-in user with no token has no business on the register page
    if (!loading && user && !token) {
        router.replace('/dashboard');
        return null;
    }

    // If we have a session with a token, we don't need to wait for token validation
    if (loading && !user) {
        return (
            <div className="terminal-theme min-h-screen bg-black scanlines animate-crt-flicker flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-black border-2 border-primary">
                    <CardContent className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-primary font-terminal tracking-wider">&gt; Validating invitation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Block access if there's no valid invitation (covers unauthenticated users with bad/missing tokens)
    if (error || !invitation) {
        return (
            <div className="terminal-theme min-h-screen bg-black scanlines animate-crt-flicker flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-black border-2 border-secondary">
                    <CardContent className="p-8">
                        <Alert variant="destructive" className="bg-black border-secondary">
                            <AlertCircle className="h-4 w-4 text-secondary" />
                            <AlertDescription className="font-terminal text-secondary tracking-wide">
                                [!] ERROR: {error || 'Invalid invitation token'}
                            </AlertDescription>
                        </Alert>

                        <div className="mt-6 text-center space-y-4">
                            <p className="text-sm text-muted-foreground font-terminal tracking-wide">
                                Need assistance? Contact support.
                            </p>
                            <p className="text-sm text-muted-foreground font-terminal">
                                Email: <a href="mailto:support@skywide.co" className="text-primary hover:underline terminal-glow">
                                    support@skywide.co
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <AuthLayout>
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl md:text-3xl font-terminal terminal-glow text-primary tracking-[0.3em]">
                        Complete Registration
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
                        Welcome to Skywide Content Management
                    </p>
                </div>

                <RegistrationForm
                    invitation={invitation}
                    onSubmit={handleRegistration}
                    isLoading={isSubmitting}
                />

                <div className="text-center pt-2">
                    <p className="text-sm text-muted-foreground font-terminal tracking-wide">
                        Already have an account?{' '}
                        <a
                            href="/login"
                            className="text-primary hover:text-primary/80 terminal-glow transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push('/login');
                            }}
                        >
                            Sign In
                        </a>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}

export default function Register() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><span className="text-primary font-terminal terminal-glow">&gt; LOADING...</span></div>}>
            <RegisterContent />
        </Suspense>
    );
}
