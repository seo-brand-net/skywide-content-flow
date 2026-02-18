"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { resetPassword } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            return;
        }

        setIsLoading(true);

        try {
            await resetPassword(email);
            setIsSuccess(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <AuthLayout>
                <div className="space-y-6 text-center">
                    <div className="flex justify-center">
                        <CheckCircle2 className="w-16 h-16 text-primary terminal-glow" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-terminal terminal-glow text-primary tracking-[0.3em]">
                            Email Sent!
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
                            Reset instructions have been sent to your email.
                        </p>
                    </div>
                    <div className="p-4 border border-primary bg-black/50">
                        <p className="text-xs font-terminal text-muted-foreground tracking-wide">
                            Check your inbox for further instructions.
                        </p>
                        <p className="text-xs font-terminal text-muted-foreground tracking-wide mt-2">
                            The link expires in 60 minutes.
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/login')}
                        className="w-full h-12 border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-lg tracking-[0.3em] transition-all duration-300 rounded-none"
                    >
                        Back to Sign In
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl md:text-3xl font-terminal terminal-glow text-primary tracking-[0.3em]">
                        Reset Password
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
                        Enter your email to receive reset instructions
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

                    <div className="relative group pt-2">
                        <div className="absolute -inset-1 bg-primary/20 blur-xl animate-slow-pulse group-hover:bg-primary/40 transition-all duration-300"></div>
                        <Button
                            type="submit"
                            className="relative w-full h-12 border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-lg tracking-[0.3em] transition-all duration-300 hover:scale-105 animate-slow-pulse rounded-none"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </div>
                </form>

                <div className="text-center pt-2">
                    <button
                        type="button"
                        className="text-sm font-terminal text-primary hover:text-primary/80 transition-colors tracking-wider"
                        onClick={() => router.push('/login')}
                    >
                        Back to Sign In
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
}
