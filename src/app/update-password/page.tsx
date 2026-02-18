"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { updatePassword, session } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!session) {
            setError('Session expired. Please request a new password reset link.');
        }
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await updatePassword(password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) {
        return (
            <AuthLayout>
                <div className="space-y-6">
                    <Alert variant="destructive" className="bg-black border-2 border-secondary">
                        <AlertCircle className="h-4 w-4 text-secondary" />
                        <AlertDescription className="font-terminal text-secondary tracking-wide">
                            Session expired. Please request a new reset link.
                        </AlertDescription>
                    </Alert>
                    <div className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground font-terminal tracking-wide">
                            Your reset link has expired.
                        </p>
                        <p className="text-xs text-muted-foreground font-terminal tracking-wide">
                            Please request a new password reset.
                        </p>
                        <Button
                            onClick={() => router.push('/reset-password')}
                            className="w-full h-12 border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-lg tracking-[0.3em] transition-all duration-300 rounded-none"
                        >
                            Request New Link
                        </Button>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl md:text-3xl font-terminal terminal-glow text-primary tracking-[0.3em]">
                        Update Password
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
                        Enter your new password below
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive" className="bg-black border-2 border-secondary">
                        <AlertCircle className="h-4 w-4 text-secondary" />
                        <AlertDescription className="font-terminal text-secondary tracking-wide text-xs">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label
                            htmlFor="password"
                            className="font-terminal text-primary terminal-glow tracking-wider text-sm"
                        >
                            New Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 bg-black border-2 border-primary text-primary font-terminal placeholder:text-muted-foreground focus:ring-primary focus:ring-2 rounded-none pr-12"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-primary/10 text-primary rounded-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="confirmPassword"
                            className="font-terminal text-primary terminal-glow tracking-wider text-sm"
                        >
                            Confirm Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="h-12 bg-black border-2 border-primary text-primary font-terminal placeholder:text-muted-foreground focus:ring-primary focus:ring-2 rounded-none pr-12"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-primary/10 text-primary rounded-none"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="relative group pt-2">
                        <div className="absolute -inset-1 bg-primary/20 blur-xl animate-slow-pulse group-hover:bg-primary/40 transition-all duration-300"></div>
                        <Button
                            type="submit"
                            className="relative w-full h-12 border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-lg tracking-[0.3em] transition-all duration-300 hover:scale-105 animate-slow-pulse rounded-none"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
}
