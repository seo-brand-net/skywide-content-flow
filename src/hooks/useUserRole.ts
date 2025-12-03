import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole(userId?: string) {
  const [userRole, setUserRole] = useState<string>('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!userId) {
        setLoading(false);
        initialLoadRef.current = false;
        return;
      }

      // Only show loading state on initial load, not during navigation
      if (!initialLoadRef.current) {
        setLoading(false);
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setLoading(false);
          initialLoadRef.current = false;
          return;
        }

        const role = profile?.role || 'user';
        setUserRole(role);
        setIsAdmin(role === 'admin');
      } catch (error) {
        console.error('Error in checkUserRole:', error);
      } finally {
        setLoading(false);
        initialLoadRef.current = false;
      }
    };

    checkUserRole();
  }, [userId]);

  return { userRole, isAdmin, loading };
}