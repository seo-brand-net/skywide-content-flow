import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useInvitationToken } from '@/hooks/useInvitationToken';
import { RegistrationForm } from '@/components/registration/RegistrationForm';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';

interface RegistrationFormData {
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const token = searchParams.get('token');
  const { invitation, loading, error } = useInvitationToken(token);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleRegistration = async (formData: RegistrationFormData) => {
    if (!invitation || !token) return;

    setIsSubmitting(true);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            full_name: invitation.full_name,
            display_name: invitation.full_name,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
          navigate('/login');
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: invitation.email,
          full_name: invitation.full_name,
          display_name: invitation.full_name,
          role: invitation.role,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw here as the user account was created successfully
      }

      // Update invitation status
      const { error: invitationError } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('token', token);

      if (invitationError) {
        console.error('Invitation update error:', invitationError);
        // Don't throw here as the user account was created successfully
      }

      toast({
        title: "Account Created Successfully!",
        description: `Welcome to SKYWIDE Content Dashboard! You can now sign in with your credentials.`,
      });

      // Redirect to login page
      navigate('/login');

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || 'Failed to create account. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Invalid invitation token'}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Need help? Contact our support team.
              </p>
              <p className="text-sm text-muted-foreground">
                Email: <a href="mailto:support@skywide.co" className="text-primary hover:underline">
                  support@skywide.co
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="large" />
          </div>
          <h2 className="text-xl text-foreground mb-2">Complete Your Registration</h2>
          <p className="text-muted-foreground">Welcome to SKYWIDE Content Dashboard</p>
        </div>
        
        <RegistrationForm
          invitation={invitation}
          onSubmit={handleRegistration}
          isLoading={isSubmitting}
        />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a 
              href="/login" 
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}