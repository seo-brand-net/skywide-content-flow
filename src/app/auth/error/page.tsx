'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error') || 'Unknown authentication error';

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle>Authentication Error</CardTitle>
                    <CardDescription>
                        We couldn't complete your authentication request
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button asChild className="w-full">
                            <Link href="/reset-password">Try Password Reset Again</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                        If this problem persists, please contact support
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
