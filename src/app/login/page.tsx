"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            return;
        }

        setIsLoading(true);

        try {
            await signIn(email, password);
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
                        <CardTitle className="text-2xl seobrand-title seobrand-title-accent">Welcome Back</CardTitle>
                        <CardDescription className="seobrand-description">
                            Sign in to your SKYWIDE account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
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

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
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

                            <Button
                                type="submit"
                                className="w-full h-11 hover-glow"
                                disabled={isLoading}
                                role='button'
                                aria-label='Sign In'
                                data-testid="sign-in-button"
                            >
                                {isLoading ? (
                                    'Loading...'
                                ) : (
                                    <>
                                        <LogIn className="mr-2 h-4 w-4" />
                                        Sign In
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                className="text-sm text-brand-blue-crayola hover:text-brand-blue-crayola/80 transition-colors"
                                onClick={() => router.push('/reset-password')}
                            >
                                Forgot your password?
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Invitation Only Message */}
                <Card className="mt-4 bg-muted/50 border-muted-foreground/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4 text-brand-blue-crayola" />
                            <span className="text-sm font-medium seobrand-subtitle">Invitation Only</span>
                        </div>
                        <p className="text-xs seobrand-description">
                            Don't have an account? Contact your administrator to receive an invitation.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
