import { supabase } from '@/lib/supabase';

export async function sendCustomPasswordResetEmail(email: string): Promise<{ error: any }> {
  try {
    console.log('Initiating password reset for:', email);

    // Get user profile for personalization - make this non-blocking
    let userFullName = undefined;
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('email', email)
        .single();

      if (!profileError && profiles) {
        userFullName = profiles.full_name;
      }
    } catch (e) {
      console.warn('Could not fetch user profile for reset email:', e);
    }

    // Send custom branded email via edge function (primary method)
    console.log('Attempting custom email via edge function...');
    const { data: functionData, error: functionError } = await supabase.functions.invoke('send-password-reset', {
      body: {
        email,
        resetUrl: `${window.location.origin}/reset-password`,
        userFullName,
      }
    });

    // Check for both invocation error and logical error in function response
    if (functionError || (functionData && functionData.success === false)) {
      console.error('Custom email service failed:', functionError || functionData?.error);

      // Fallback to Supabase default email if edge function fails
      console.log('Falling back to Supabase default email service...');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        console.error('Supabase default reset service also failed:', resetError);
        return { error: resetError };
      }

      console.log('Fallback email initiated via Supabase.');
    } else {
      console.log('Custom reset email sent successfully via edge function.');
    }

    return { error: null };
  } catch (error: any) {
    console.error('Password reset service encountered a fatal error:', error);
    return { error };
  }
}