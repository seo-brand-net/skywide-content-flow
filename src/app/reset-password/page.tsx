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
    const [step, setStep] = useState<'request' | 'reset'>('request');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { user, session, updatePassword, isPasswordReset } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    useEffect(() => {
        const handleRecovery = async () => {
            const urlParams = new URL(window.location.href).searchParams;
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const type = urlParams.get('type') || hashParams.get('type');
            const code = urlParams.get('code') || hashParams.get('code');

            // 1. Priority: Direct recovery code in URL
            if (type === 'recovery' && code) {
                console.log('Recovery token detected in URL, exchanging...');
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (!error && data.session) {
                    setStep('reset');
                    // Clean URL
                    const url = new URL(window.location.href);
                    url.searchParams.delete('code');
                    url.searchParams.delete('type');
                    window.history.replaceState({}, '', url.pathname + url.search);
                    return;
                } else {
                    console.error('Failed to exchange code:', error);
                    toast({
                        title: "Reset Link Invalid",
                        description: "Your reset link may have expired. Please request a new one.",
                        variant: "destructive",
                    });
                }
            }

            // 2. Secondary: Auth context already says we're in reset flow
            // Check session explicitly to be sure
            if (isPasswordReset) {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    setStep('reset');
                }
            }
        };

        handleRecovery();
    }, [isPasswordReset, toast]);

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

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: "Password Mismatch",
                description: "Passwords do not match.",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Password Too Short",
                description: "Password must be at least 6 characters long.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await updatePassword(password);
            if (!error) {
                router.push('/dashboard');
            }
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
                    <p className="text-muted-foreground">Content Request Dashboard</p>
                </div>

                <Card className="hover-glow animate-fade-in">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                            {step === 'request' ? 'Reset Password' : 'Set New Password'}
                        </CardTitle>
                        <CardDescription>
                            {step === 'request'
                                ? 'Enter your email to receive reset instructions'
                                : 'Enter your new password below'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 'request' ? (
                            <form onSubmit={handleRequestReset} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-11"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 hover-glow"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        'Sending...'
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Send Reset Email
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter new password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="h-11 pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="h-11 pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 hover-glow"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        'Updating...'
                                    ) : (
                                        <>
                                            <Lock className="mr-2 h-4 w-4" />
                                            Update Password
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}

                        {step === 'reset' && (
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setStep('request');
                                        sessionStorage.removeItem('isPasswordReset');
                                        // Also clear potential tokens from URL
                                        window.history.replaceState({}, '', window.location.pathname);
                                    }}
                                >
                                    Need to request a new link?
                                </button>
                            </div>
                        )}

                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                className="text-sm text-brand-cyan hover:text-brand-cyan/80"
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
