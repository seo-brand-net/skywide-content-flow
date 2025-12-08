import { supabase } from '@/lib/supabase';

export async function sendCustomPasswordResetEmail(email: string): Promise<{ error: any }> {
  try {
    // Get user profile for personalization
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('email', email)
      .single();

    // Send custom branded email via edge function (primary method)
    const { error: emailError } = await supabase.functions.invoke('send-password-reset', {
      body: {
        email,
        resetUrl: `${window.location.origin}/reset-password`,
        userFullName: profiles?.full_name || undefined,
      }
    });

    if (emailError) {
      console.error('Custom email error:', emailError);
      // Fallback to Supabase default email
      console.log('Falling back to Supabase default email');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        console.error('Supabase reset error:', resetError);
        return { error: resetError };
      }
    }

    return { error: null };
  } catch (error) {
    console.error('Password reset service error:', error);
    return { error };
  }
}