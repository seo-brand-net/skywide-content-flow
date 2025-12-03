import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Invitation } from '@/types/invitation';

export function useInvitationToken(token: string | null) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: supabaseError } = await supabase
          .from('user_invitations')
          .select('id, email, full_name, role, expires_at, status, created_at, token')
          .eq('token', token)
          .eq('status', 'pending')
          .maybeSingle();

        if (supabaseError) {
          console.error('Token validation error:', supabaseError);
          setError('Failed to validate invitation');
          return;
        }

        if (!data) {
          setError('Invalid invitation token');
          return;
        }

        // Check if token has expired
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        if (now > expiresAt) {
          setError('This invitation has expired');
          return;
        }

        setInvitation(data);
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  return { invitation, loading, error };
}