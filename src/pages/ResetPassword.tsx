import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, resetPassword, updatePassword, isPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we're in password reset mode from auth context
    if (isPasswordReset) {
      setStep('reset');
      return;
    }

    // Exchange recovery code for session
    const type = searchParams.get('type');
    const code = searchParams.get('code');
    
    if (type === 'recovery' && code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          setStep('reset');
          // Clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('type');
          window.history.replaceState({}, '', url.toString());
        } else {
          console.error('Failed to exchange code:', error);
          toast({
            title: "Error",
            description: "Invalid or expired reset link. Please request a new one.",
            variant: "destructive",
          });
        }
      });
    }
  }, [searchParams, isPasswordReset, toast]);

  // Redirect authenticated users to dashboard (but not during password reset)
  useEffect(() => {
    if (user && step === 'request' && !isPasswordReset) {
      navigate('/dashboard');
    }
  }, [user, navigate, step, isPasswordReset]);

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
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link from SKYWIDE.",
        });
      }
    } catch (error) {
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
        navigate('/dashboard');
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

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-brand-cyan hover:text-brand-cyan/80"
                onClick={() => navigate('/login')}
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