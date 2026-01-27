"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { resetPassword } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        setIsLoading(true);
        try {
            const { error } = await resetPassword(trimmedEmail);
            if (!error) {
                toast({
                    title: "Check your email",
                    description: "If an account exists for this email, you will receive a reset link shortly.",
                });
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
                        <CardTitle className="text-2xl seobrand-title seobrand-title-accent">
                            Reset Password
                        </CardTitle>
                        <CardDescription className="seobrand-description">
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
                                    className="h-11"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 hover-glow"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : (
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
                                className="text-sm text-brand-blue-crayola hover:text-brand-blue-crayola/80 transition-colors"
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
