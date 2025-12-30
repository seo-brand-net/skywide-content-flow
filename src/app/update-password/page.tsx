"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

function UpdatePasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);

    const { updatePassword, setIsPasswordReset } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const handleRecovery = async () => {
            const urlParams = new URL(window.location.href).searchParams;
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const type = urlParams.get('type') || hashParams.get('type');
            const code = urlParams.get('code') || hashParams.get('code');

            if (type === 'recovery' && code) {
                console.log('Recovery token detected, exchanging on dedicated update page...');
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (!error && data.session) {
                    setIsPasswordReset(true);
                    sessionStorage.setItem('isPasswordReset', 'true');
                    // Clean URL
                    const url = new URL(window.location.href);
                    url.searchParams.delete('code');
                    url.searchParams.delete('type');
                    window.history.replaceState({}, '', url.pathname + url.search);
                } else {
                    console.error('Failed to exchange code:', error);
                    toast({
                        title: "Reset Link Invalid",
                        description: "Your reset link may have expired or is invalid. Please request a new one.",
                        variant: "destructive",
                    });
                    router.push('/reset-password');
                }
            } else {
                // No token in URL, check if we already have a session from a recent exchange
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast({
                        title: "Access Denied",
                        description: "No active password reset session found. Please use the link from your email.",
                        variant: "destructive",
                    });
                    router.push('/reset-password');
                }
            }
            setIsValidating(false);
        };

        handleRecovery();
    }, [setIsPasswordReset, toast, router]);

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) return;

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

    if (isValidating) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
            </div>
        );
    }

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
                            Set New Password
                        </CardTitle>
                        <CardDescription>
                            Please enter your new secure password below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="········"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-11 pr-10 focus-visible:ring-brand-cyan"
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
                                        placeholder="········"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="h-11 pr-10 focus-visible:ring-brand-cyan"
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
                                className="w-full h-11 bg-brand-cyan hover:bg-brand-cyan/90 text-background font-bold hover-glow transition-all duration-300"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                                        <span>Updating...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center">
                                        <Lock className="mr-2 h-4 w-4" />
                                        Update Password
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

export default function UpdatePasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
            </div>
        }>
            <UpdatePasswordContent />
        </Suspense>
    );
}
