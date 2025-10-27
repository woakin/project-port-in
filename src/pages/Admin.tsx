import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, TrendingUp, Save, Loader2, Building2, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Stats = {
  totalUsers: number;
  totalDiagnoses: number;
  totalCompanies: number;
};

type UserWithDetails = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  company_id: string | null;
  company?: {
    id: string;
    name: string;
    industry: string | null;
  };
  diagnoses: {
    id: string;
    maturity_level: string | null;
    strategy_score: number | null;
    operations_score: number | null;
    finance_score: number | null;
    marketing_score: number | null;
    legal_score: number | null;
    technology_score: number | null;
    created_at: string;
  }[];
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
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (authLoading || adminLoading) return;
    
    if (!user || !isAdmin) {
      navigate('/');
      return;
    }

    // Solo cargar datos si el usuario es admin
    loadStats();
    loadSystemPrompt();
    loadUsers();
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

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      // Obtener usuarios con sus perfiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Para cada usuario, obtener sus empresas y diagnósticos
      const usersWithDetails = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Obtener empresa si existe
          let company = null;
          if (profile.company_id) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('id, name, industry')
              .eq('id', profile.company_id)
              .single();
            company = companyData;
          }

          // Obtener diagnósticos del usuario
          const { data: diagnosesData } = await supabase
            .from('diagnoses')
            .select('id, maturity_level, strategy_score, operations_score, finance_score, marketing_score, legal_score, technology_score, created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name || '',
            created_at: profile.created_at,
            company_id: profile.company_id,
            company: company || undefined,
            diagnoses: diagnosesData || []
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const getMaturityColor = (level: string | null) => {
    switch (level) {
      case 'idea':
        return 'bg-red-500';
      case 'startup':
        return 'bg-orange-500';
      case 'growth':
        return 'bg-yellow-500';
      case 'mature':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getMaturityLabel = (level: string | null) => {
    switch (level) {
      case 'idea':
        return 'Idea';
      case 'startup':
        return 'Startup';
      case 'growth':
        return 'Crecimiento';
      case 'mature':
        return 'Maduro';
      default:
        return 'Sin diagnóstico';
    }
  };

  const getAverageScore = (diagnosis: UserWithDetails['diagnoses'][0]) => {
    const scores = [
      diagnosis.strategy_score,
      diagnosis.operations_score,
      diagnosis.finance_score,
      diagnosis.marketing_score,
      diagnosis.legal_score,
      diagnosis.technology_score
    ].filter((score): score is number => score !== null);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const hasChanges = systemPrompt !== originalPrompt;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona usuarios, configuración del sistema y revisa estadísticas
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">

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
          </TabsContent>

          <TabsContent value="users" className="space-y-6 mt-6">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Card key={user.id} variant="content">
                    <div className="space-y-4">
                      {/* Información del usuario */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {user.full_name || 'Sin nombre'}
                          </h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {user.diagnoses.length} diagnóstico{user.diagnoses.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Empresa asociada */}
                      {user.company && (
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.company.name}</p>
                            {user.company.industry && (
                              <p className="text-xs text-muted-foreground">{user.company.industry}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Diagnósticos */}
                      {user.diagnoses.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Activity className="h-4 w-4" />
                            Diagnósticos Realizados
                          </div>
                          <div className="space-y-2">
                            {user.diagnoses.map((diagnosis) => (
                              <div
                                key={diagnosis.id}
                                className="p-3 border border-border rounded-lg space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${getMaturityColor(diagnosis.maturity_level)}`}
                                    />
                                    <span className="text-sm font-medium text-foreground">
                                      {getMaturityLabel(diagnosis.maturity_level)}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(diagnosis.created_at).toLocaleDateString('es-ES')}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Estrategia</p>
                                    <p className="font-semibold text-foreground">
                                      {diagnosis.strategy_score ?? '-'}/100
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Operaciones</p>
                                    <p className="font-semibold text-foreground">
                                      {diagnosis.operations_score ?? '-'}/100
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Finanzas</p>
                                    <p className="font-semibold text-foreground">
                                      {diagnosis.finance_score ?? '-'}/100
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Marketing</p>
                                    <p className="font-semibold text-foreground">
                                      {diagnosis.marketing_score ?? '-'}/100
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Legal</p>
                                    <p className="font-semibold text-foreground">
                                      {diagnosis.legal_score ?? '-'}/100
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">Tecnología</p>
                                    <p className="font-semibold text-foreground">
                                      {diagnosis.technology_score ?? '-'}/100
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-border">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Promedio General</span>
                                    <span className="text-sm font-bold text-primary">
                                      {getAverageScore(diagnosis)}/100
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.diagnoses.length === 0 && (
                        <p className="text-sm text-muted-foreground italic py-4 text-center">
                          Este usuario aún no ha realizado ningún diagnóstico
                        </p>
                      )}
                    </div>
                  </Card>
                ))}

                {users.length === 0 && (
                  <Card variant="content">
                    <p className="text-center text-muted-foreground py-8">
                      No hay usuarios registrados
                    </p>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-6 mt-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
