import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, TrendingUp, Save, Loader2 } from 'lucide-react';

type Stats = {
  totalUsers: number;
  totalDiagnoses: number;
  totalCompanies: number;
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDiagnoses: 0,
    totalCompanies: 0
  });
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    
    if (!user || !isAdmin) {
      navigate('/');
      return;
    }

    // Solo cargar datos si el usuario es admin
    loadStats();
    loadSystemPrompt();
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      // Obtener total de usuarios
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Obtener total de diagnósticos
      const { count: diagnosesCount, error: diagnosesError } = await supabase
        .from('diagnoses')
        .select('*', { count: 'exact', head: true });

      if (diagnosesError) throw diagnosesError;

      // Obtener total de empresas
      const { count: companiesCount, error: companiesError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      if (companiesError) throw companiesError;

      setStats({
        totalUsers: usersCount || 0,
        totalDiagnoses: diagnosesCount || 0,
        totalCompanies: companiesCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive'
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadSystemPrompt = async () => {
    try {
      setLoadingPrompt(true);
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'chat_diagnosis_system_prompt')
        .single();

      if (error) throw error;

      const prompt = (data.value as any).prompt || '';
      setSystemPrompt(prompt);
      setOriginalPrompt(prompt);
    } catch (error) {
      console.error('Error loading system prompt:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el system prompt',
        variant: 'destructive'
      });
    } finally {
      setLoadingPrompt(false);
    }
  };

  const saveSystemPrompt = async () => {
    if (!systemPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'El system prompt no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('system_config')
        .update({
          value: { prompt: systemPrompt },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('key', 'chat_diagnosis_system_prompt');

      if (error) throw error;

      setOriginalPrompt(systemPrompt);
      toast({
        title: 'Guardado',
        description: 'El system prompt se actualizó correctamente'
      });
    } catch (error) {
      console.error('Error saving system prompt:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el system prompt',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" />;
  }

  const hasChanges = systemPrompt !== originalPrompt;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona la configuración del sistema y revisa estadísticas
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="content">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuarios Registrados</p>
                <p className="text-2xl font-bold text-foreground">
                  {loadingStats ? '...' : stats.totalUsers}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="content">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diagnósticos Realizados</p>
                <p className="text-2xl font-bold text-foreground">
                  {loadingStats ? '...' : stats.totalDiagnoses}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="content">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Empresas Registradas</p>
                <p className="text-2xl font-bold text-foreground">
                  {loadingStats ? '...' : stats.totalCompanies}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* System Prompt Editor */}
        <Card variant="content">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">System Prompt del Diagnóstico</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Edita las instrucciones que guían al asistente durante el chat de diagnóstico
              </p>
            </div>

            {loadingPrompt ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Escribe el system prompt aquí..."
                  className="min-h-[400px] font-mono text-sm"
                />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {hasChanges && '● Hay cambios sin guardar'}
                  </p>
                  <div className="flex gap-2">
                    {hasChanges && (
                      <Button
                        variant="outline"
                        onClick={() => setSystemPrompt(originalPrompt)}
                        disabled={saving}
                      >
                        Descartar
                      </Button>
                    )}
                    <Button
                      onClick={saveSystemPrompt}
                      disabled={saving || !hasChanges}
                      className="gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
