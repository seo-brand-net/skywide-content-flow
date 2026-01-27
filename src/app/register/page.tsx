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
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const token = searchParams.get('token');
    const { invitation, loading, error } = useInvitationToken(token);
    const { signIn } = useAuth();

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleRegistration = async (formData: RegistrationFormData) => {
        if (!invitation || !token) return;

        setIsSubmitting(true);

        try {
            // Call Server API to register (handles auto-confirm)
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: invitation.email,
                    password: formData.password,
                    role: invitation.role,
                    fullName: invitation.full_name,
                    token: token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) { // Conflict / Already Registered
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
                description: `Welcome to SKYWIDE Content Dashboard! Signing you in...`,
            });

            // Auto-login after successful registration
            const { error: signInError } = await signIn(invitation.email, formData.password);

            if (signInError) {
                console.error('Auto-login failed:', signInError);
                toast({
                    title: "Auto-login Failed",
                    description: "Account created but sign-in failed. Please log in manually.",
                    variant: "destructive",
                });
                router.push('/login');
            }
            // If signIn succeeds, it will handle the redirect to dashboard

        } catch (error: any) {
            console.error('Registration error:', error);
            toast({
                title: "Registration Failed",
                description: error.message || 'Failed to create account. Please try again.',
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
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

    if (error || !invitation) {
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
