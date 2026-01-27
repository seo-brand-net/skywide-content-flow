'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';

export default function AuthTestPage() {
    const [email, setEmail] = useState('');
    const [testUrl, setTestUrl] = useState('');
    const supabase = createClient();

    const handleResetPassword = async () => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });

        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert('Check your email for the reset link!');
        }
    };

    const simulateCallback = () => {
        if (!testUrl) {
            alert('Paste the full URL from the email link');
            return;
        }

        // Extract the hash part from the email URL
        const url = new URL(testUrl);
        const hash = url.hash;

        // Navigate to callback with the hash
        window.location.href = `/auth/callback${hash}`;
    };

    return (
        <div className="container max-w-2xl mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>🧪 Auth Testing Utility</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Method 1: Send actual email */}
                    <div className="space-y-3">
                        <h3 className="font-semibold">Method 1: Send Reset Email</h3>
                        <div className="space-y-2">
                            <Label>Your Email</Label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleResetPassword} className="w-full">
                            Send Password Reset Email
                        </Button>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="font-semibold mb-3">Method 2: Test With Email Link (Skip Wait)</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Copy the full URL from the reset email and paste it here to test the callback directly:
                        </p>
                        <div className="space-y-2">
                            <Label>Full URL from email</Label>
                            <Input
                                placeholder="https://skywide-content-flow.vercel.app/auth/callback?..."
                                value={testUrl}
                                onChange={(e) => setTestUrl(e.target.value)}
                            />
                        </div>
                        <Button onClick={simulateCallback} className="w-full mt-2" variant="secondary">
                            Test Callback
                        </Button>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="font-semibold mb-2">Current Callback URL</h3>
                        <code className="text-xs bg-muted p-2 rounded block">
                            {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'Loading...'}
                        </code>
                        <p className="text-xs text-muted-foreground mt-2">
                            ✅ Make sure this URL is added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
