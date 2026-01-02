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

    // Send custom branded email via API route (primary method)
    console.log('DEBUG: Attempting custom email via NEXT.JS API ROUTE (v2)...');
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        resetUrl: `${window.location.origin}/auth/callback?next=/update-password`,
        userFullName,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Custom email service failed:', data.error);

      // Fallback to Supabase default email if API route fails
      console.log('Falling back to Supabase default email service...');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (resetError) {
        console.error('Supabase default reset service also failed:', resetError);
        return { error: resetError };
      }

      console.log('Fallback email initiated via Supabase.');
    } else {
      console.log('Custom reset email sent successfully via API route.');
    }

    return { error: null };
  } catch (error: any) {
    console.error('Password reset service encountered a fatal error:', error);
    return { error };
  }
}