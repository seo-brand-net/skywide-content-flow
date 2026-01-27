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
import { Logo } from '@/components/Logo';

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

    // Construct invitation from session if user is logged in
    const invitation: any = user ? {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        role: user.user_metadata?.role || 'user',
        status: 'accepted',
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        token: 'native_invite'
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

    // If we have a session, we don't need to wait for token validation
    if (loading && !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Validating invitation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // CRITICAL: If we have a user, we ignore the token error because we're doing session-based set-password
    if ((error && !user) || (!invitation && !user)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {error || 'Invalid invitation token'}
                            </AlertDescription>
                        </Alert>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                Need help? Contact our support team.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Email: <a href="mailto:support@skywide.co" className="text-primary hover:underline">
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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size="large" />
                    </div>
                    <h2 className="text-xl text-foreground mb-2">Complete Your Registration</h2>
                    <p className="text-muted-foreground">Welcome to SKYWIDE Content Dashboard</p>
                </div>

                <RegistrationForm
                    invitation={invitation}
                    onSubmit={handleRegistration}
                    isLoading={isSubmitting}
                />

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <a
                            href="/login"
                            className="text-primary hover:underline font-medium"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push('/login');
                            }}
                        >
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Register() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
