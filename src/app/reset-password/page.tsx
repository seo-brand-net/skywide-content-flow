"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

function ResetPasswordContent() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { user, isPasswordReset } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const handleRecoveryRedirect = async () => {
            const urlParams = new URL(window.location.href).searchParams;
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const type = urlParams.get('type') || hashParams.get('type');
            const code = urlParams.get('code') || hashParams.get('code');

            if (type === 'recovery' && code) {
                // Redirect directly to the dedicated update page with all params
                router.push('/update-password' + window.location.search + window.location.hash);
            }
        };

        handleRecoveryRedirect();
    }, [router]);

    // Redirect authenticated users to dashboard (but not during password reset)
    useEffect(() => {
        if (user && !isPasswordReset) {
            router.push('/dashboard');
        }
    }, [user, router, isPasswordReset]);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            return;
        }

        setIsLoading(true);

        try {
            // Import the custom password reset service
            const { sendCustomPasswordResetEmail } = await import("@/services/passwordResetService");
            const { error } = await sendCustomPasswordResetEmail(email);

            if (error) {
                console.error('Password reset failed:', error);
                toast({
                    title: "Reset Failed",
                    description: error.message || "Could not send reset email. Please try again later.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Check your email",
                    description: "If an account exists for this email, you will receive a reset link shortly.",
                });
            }
        } catch (error: any) {
            console.error('Unexpected error during password reset:', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size="large" />
                    </div>
                    <p className="text-muted-foreground">Secure Domain Branding</p>
                </div>

                <Card className="hover-glow animate-fade-in border-brand-cyan/20">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-purple">
                            Reset Password
                        </CardTitle>
                        <CardDescription>
                            Enter your email to receive reset instructions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRequestReset} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11 focus-visible:ring-brand-cyan"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 bg-brand-cyan hover:bg-brand-cyan/90 text-background font-bold hover-glow transition-all duration-300"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                                        <span>Sending...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center">
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Reset Email
                                    </div>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                className="text-sm text-muted-foreground hover:text-brand-cyan transition-colors"
                                onClick={() => router.push('/login')}
                            >
                                Back to Sign In
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ResetPassword() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
