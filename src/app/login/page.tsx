"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

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
        <AuthLayout>
            {/* Login Form */}
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl md:text-3xl font-terminal terminal-glow text-primary tracking-[0.3em]">
                        SIGN IN
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
                        Enter your credentials to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label
                            htmlFor="email"
                            className="font-terminal text-primary terminal-glow tracking-wider text-sm"
                        >
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 bg-black border-2 border-primary text-primary font-terminal placeholder:text-muted-foreground focus:ring-primary focus:ring-2 rounded-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="password"
                            className="font-terminal text-primary terminal-glow tracking-wider text-sm"
                        >
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
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

                    <div className="relative group pt-2">
                        <div className="absolute -inset-1 bg-primary/20 blur-xl animate-slow-pulse group-hover:bg-primary/40 transition-all duration-300"></div>
                        <Button
                            type="submit"
                            className="relative w-full h-12 border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-lg tracking-[0.3em] transition-all duration-300 hover:scale-105 animate-slow-pulse rounded-none"
                            disabled={isLoading}
                            role='button'
                            aria-label='Sign In'
                            data-testid="sign-in-button"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </div>
                </form>

                <div className="text-center pt-2">
                    <button
                        type="button"
                        className="text-sm font-terminal text-primary hover:text-primary/80 transition-colors tracking-wider"
                        onClick={() => router.push('/reset-password')}
                    >
                        Forgot Password?
                    </button>
                </div>

                {/* Invitation Only Notice */}
                <div className="mt-6 p-4 border border-secondary bg-black/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-terminal terminal-glow-red text-secondary tracking-wider">
                            Notice
                        </span>
                    </div>
                    <p className="text-xs font-terminal text-muted-foreground tracking-wide">
                        This system is invitation-only. Contact your administrator for access.
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
