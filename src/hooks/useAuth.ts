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
    try {
      // Caso base: limpiar SIEMPRE la sesión local primero
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      
      // Limpieza manual de estado y storage de la app
      setSession(null);
      setUser(null);
      setRoles([]);
      localStorage.removeItem('current_project_id');
      
      // Revocación remota best-effort (no bloqueante)
      supabase.auth.signOut().catch(() => {});
      
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
      
      // Redirección dura para remontar la app en estado no autenticado
      window.location.replace('/auth');
    } catch (error: any) {
      // Aún ante errores, forzar salida del estado autenticado
      setSession(null);
      setUser(null);
      setRoles([]);
      localStorage.removeItem('current_project_id');
      
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
      window.location.replace('/auth');
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
