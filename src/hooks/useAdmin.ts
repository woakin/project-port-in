import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Client-side admin role checking hook
 * 
 * SECURITY NOTE: This hook is for UX purposes only (navigation guards, UI visibility).
 * All actual data access and operations are protected by server-side RLS policies
 * that use has_role(auth.uid(), 'admin') for enforcement.
 * 
 * Attackers can bypass client-side checks, but backend will reject unauthorized operations.
 */
export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (authLoading) return;
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, loading };
}
