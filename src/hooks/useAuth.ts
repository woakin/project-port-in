import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'manager' | 'team_member' | 'external_consultant';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clean localStorage when user logs out (after Supabase completes logout)
        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          // Only clear app-specific keys to avoid interference with Supabase
          const currentProjectKey = 'current_project_id';
          localStorage.removeItem(currentProjectKey);
        }
        
        // Fetch roles after auth state changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      
      setRoles(data.map((r: { role: AppRole }) => r.role));
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Registro exitoso',
        description: 'Tu cuenta ha sido creada correctamente.',
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error en registro',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error en inicio de sesión',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signOut = async () => {
    // Helper: aggressive clear of auth-related storage keys
    const clearAuthStorage = () => {
      try {
        const patterns = [/^sb-/i, /supabase/i, /gotrue/i];
        const clearFrom = (storage: Storage) => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;
            if (patterns.some((re) => re.test(key))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => storage.removeItem(k));
        };
        clearFrom(localStorage);
        clearFrom(sessionStorage);
        
        // App-specific keys
        const appKeys = [
          'current_project_id',
          'diagnosis_progress',
        ];
        appKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      } catch {
        // ignore
      }
    };

    try {
      // 1) Local sign out (best effort) to stop token refreshers
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});

      // 2) Aggressive storage cleanup
      clearAuthStorage();

      // 3) Clear in-memory state
      setSession(null);
      setUser(null);
      setRoles([]);

      // 4) Remote revocation (non-blocking)
      supabase.auth.signOut().catch(() => {});

      // 5) Notify and redirect to homepage
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });

      window.location.href = window.location.origin + '/';
    } catch {
      // Even if something fails, ensure cleanup and redirect
      clearAuthStorage();
      setSession(null);
      setUser(null);
      setRoles([]);
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
      window.location.href = window.location.origin + '/';
    }
  };
  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      
      toast({
        title: 'Correo enviado',
        description: 'Revisa tu correo para restablecer tu contraseña.',
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  return {
    user,
    session,
    roles,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    hasRole,
  };
}
