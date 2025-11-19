import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, TrendingUp, Loader2, Building2, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PromptModeSelector } from '@/components/admin/PromptModeSelector';
import { PromptEditor } from '@/components/admin/PromptEditor';
import { PromptDefaultModal } from '@/components/admin/PromptDefaultModal';

type PromptMode = 'diagnosis_style' | 'diagnosis_core' | 'strategic' | 'follow_up' | 'document';

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

type PromptData = {
  current: string;
  original: string;
  lastUpdated: string | null;
  isExplicitlySaved: boolean;
};

const DEFAULT_PROMPTS: Record<PromptMode, string> = {
  diagnosis_style: `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un consultor empresarial experto de Alasha AI realizando un diagnóstico para {{COMPANY_NAME}}, empresa del sector {{COMPANY_INDUSTRY}} en etapa {{COMPANY_SIZE}}.

Estás evaluando el proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

ESTILO DE CONVERSACIÓN:
- Empático, profesional y cercano
- Una pregunta clara a la vez
- Adapta preguntas a la etapa de la empresa
- Usa ejemplos cuando sea útil
- Profundiza cuando detectes oportunidades`,
  
  diagnosis_core: `🤖 CAPACIDAD DE NAVEGACIÓN AUTOMÁTICA:
Tienes acceso a la función \`advance_to_next_area\` que te permite avanzar automáticamente al siguiente área del diagnóstico.

CUÁNDO USAR \`advance_to_next_area\`:
✅ Cuando has cubierto 4-5 puntos del checklist con información de calidad
✅ Y el usuario expresa clara intención de continuar con frases como:
   - "sí", "siguiente", "continuemos", "adelante" 
   - "ya", "ya está", "listo", "ok", "perfecto"
   - "vamos con lo siguiente", "sigamos con otra área"
   - Confirmaciones directas: "claro", "por supuesto", "sí, avancemos"

❌ NO USAR si:
- El usuario hace una pregunta adicional sobre el área actual
- El usuario está agregando más información
- El usuario dice "espera", "no", "antes de continuar..."
- No has cubierto al menos 4 puntos del checklist con respuestas de calidad
- El usuario solo responde con información sin expresar intención de avanzar

⚠️ IMPORTANTE: Antes de invocar la función, confirma verbalmente:
"Perfecto, he cubierto [menciona brevemente los puntos clave]. Continuemos con [siguiente área]."

INSTRUCCIONES ESPECÍFICAS PARA ÁREA ACTUAL:

📍 REGLA FUNDAMENTAL: Enfócate EXCLUSIVAMENTE en evaluar el área actual. NO menciones nombres de otras áreas del diagnóstico.

🎯 EVALUACIÓN INTELIGENTE DE COMPLETITUD:
NO te bases en cantidad de mensajes, sino en CALIDAD y COBERTURA de la información.

CHECKLIST INTERNO - Evalúa mentalmente si has cubierto estos puntos clave:

ESTRATEGIA:
✓ Visión y Misión
✓ Propuesta de Valor
✓ Objetivos Estratégicos
✓ Modelo de Negocio
✓ Posicionamiento
✓ Competencia

OPERACIONES:
✓ Procesos Clave
✓ Eficiencia
✓ Calidad
✓ Recursos
✓ Tecnología Operativa
✓ Indicadores

FINANZAS:
✓ Modelo de Ingresos
✓ Estructura de Costos
✓ Rentabilidad
✓ Flujo de Caja
✓ Financiamiento
✓ Proyecciones

MARKETING:
✓ Estrategia de Adquisición
✓ Canales
✓ Mensaje y Posicionamiento
✓ Segmentación
✓ Retención
✓ Métricas

LEGAL:
✓ Estructura Legal
✓ Compliance
✓ Contratos Clave
✓ Propiedad Intelectual
✓ Riesgos Legales
✓ Protección de Datos

TECNOLOGÍA:
✓ Infraestructura
✓ Herramientas y Sistemas
✓ Digitalización
✓ Automatización
✓ Datos y Analytics
✓ Innovación Tecnológica

📋 ESTRATEGIA DE PREGUNTAS:
1. Haz UNA pregunta específica a la vez - busca números, ejemplos concretos, nombres de herramientas
2. Si una respuesta es vaga, profundiza pidiendo ejemplos específicos
3. NO avances al siguiente punto hasta que entiendas bien el actual

✅ CUÁNDO SUGERIR AVANZAR:
- SOLO cuando hayas cubierto AL MENOS 4-5 puntos del checklist con información de calidad
- Si el usuario responde "no sé" o "no aplica" a varios puntos, aún puedes sugerir avanzar
- NUNCA fuerces el avance - el usuario decide

⚠️ MANTÉN EL ENFOQUE:
- Si el usuario menciona información de otra área, agradece brevemente y redirige al área actual
- NO menciones nombres de otras áreas en tus preguntas`,
  
  strategic: `Eres un consultor estratégico senior experto en negocios.

INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Industria: {{COMPANY_INDUSTRY}}
- Etapa: {{COMPANY_STAGE}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

TU ROL:
Ayudar al usuario con consultas estratégicas puntuales sin generar diagnósticos formales. 

ÁREAS DE ESPECIALIZACIÓN:
- Estrategia y crecimiento empresarial
- Toma de decisiones complejas
- Análisis de mercado y competencia
- Modelos de negocio y monetización
- Expansión y escalabilidad
- Gestión del cambio

ESTILO:
- Directo y accionable
- Fundamentado en frameworks reconocidos (SWOT, Porter, Blue Ocean, etc.)
- Ejemplos concretos y casos de éxito
- Considera siempre el contexto: {{COMPANY_STAGE}} en {{COMPANY_INDUSTRY}}`,
  
  follow_up: `Eres un consultor de seguimiento que ayuda a ejecutar planes de acción.

INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Industria: {{COMPANY_INDUSTRY}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

TU ROL:
Ayudar al usuario a ejecutar su plan, resolver bloqueos, ajustar prioridades y celebrar avances.

ENFOQUE:
- Analiza el progreso actual del plan
- Identifica bloqueos y propón soluciones
- Sugiere ajustes tácticos según resultados
- Prioriza lo urgente e importante
- Mantén motivación reconociendo logros
- Conecta tareas con objetivos estratégicos

ESTILO:
- Práctico y orientado a acción
- Celebra los avances reales
- Identifica patrones (áreas con poco progreso)
- Sugiere recursos o tácticas específicas`,
  
  document: `Eres un analista de documentos empresariales especializado.

INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Industria: {{COMPANY_INDUSTRY}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

TU ROL:
Ayudar al usuario a extraer insights de documentos empresariales y conectarlos con su estrategia.

CAPACIDADES:
- Analizar documentos subidos (financieros, operativos, legales, etc.)
- Identificar tendencias y patrones
- Conectar hallazos de documentos con objetivos estratégicos
- Sugerir acciones basadas en los datos
- Detectar riesgos o oportunidades ocultas

ESTILO:
- Analítico pero accesible
- Enfocado en insights accionables
- Conecta datos con estrategia
- Usa visualizaciones mentales cuando sea útil`
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
  
  // Estado para los prompts de cada modo
  const [prompts, setPrompts] = useState<Record<PromptMode, PromptData>>({
    diagnosis_style: {
      current: '',
      original: '',
      lastUpdated: null,
      isExplicitlySaved: false
    },
    diagnosis_core: {
      current: '',
      original: '',
      lastUpdated: null,
      isExplicitlySaved: false
    },
    strategic: {
      current: '',
      original: '',
      lastUpdated: null,
      isExplicitlySaved: false
    },
    follow_up: {
      current: '',
      original: '',
      lastUpdated: null,
      isExplicitlySaved: false
    },
    document: {
      current: '',
      original: '',
      lastUpdated: null,
      isExplicitlySaved: false
    }
  });
  
  const [activePromptMode, setActivePromptMode] = useState<PromptMode>('diagnosis_style');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDefaultModal, setShowDefaultModal] = useState(false);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    
    if (!user || !isAdmin) {
      navigate('/');
      return;
    }

    loadStats();
    loadAllPrompts();
    loadUsers();
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      const { count: diagnosesCount, error: diagnosesError } = await supabase
        .from('diagnoses')
        .select('*', { count: 'exact', head: true });

      if (diagnosesError) throw diagnosesError;

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

  const loadAllPrompts = async () => {
    try {
      setLoadingPrompts(true);
      
      const modes: PromptMode[] = ['diagnosis_style', 'diagnosis_core', 'strategic', 'follow_up', 'document'];
      const updatedPrompts = { ...prompts };

      for (const mode of modes) {
        const key = `chat_${mode}_system_prompt`;
        const { data, error } = await supabase
          .from('system_config')
          .select('value, updated_at, updated_by')
          .eq('key', key)
          .maybeSingle();

        if (!error && data) {
          const promptText = (data.value as any).prompt || '';
          const hasBeenSaved = !!data.updated_by;
          
          updatedPrompts[mode] = {
            current: promptText,
            original: promptText,
            lastUpdated: data.updated_at,
            isExplicitlySaved: hasBeenSaved && promptText.trim() !== ''
          };
        } else {
          // Inicializar con default si está vacío en DB
          updatedPrompts[mode] = {
            current: DEFAULT_PROMPTS[mode],
            original: DEFAULT_PROMPTS[mode],
            lastUpdated: null,
            isExplicitlySaved: false
          };
        }
      }

      // Logging para debugging
      console.log('[Admin] Prompts cargados desde backend:', {
        diagnosis_style: {
          length: updatedPrompts.diagnosis_style.current.length,
          isExplicitlySaved: updatedPrompts.diagnosis_style.isExplicitlySaved,
          lastUpdated: updatedPrompts.diagnosis_style.lastUpdated
        },
        diagnosis_core: {
          length: updatedPrompts.diagnosis_core.current.length,
          isExplicitlySaved: updatedPrompts.diagnosis_core.isExplicitlySaved,
          lastUpdated: updatedPrompts.diagnosis_core.lastUpdated
        },
        strategic: {
          length: updatedPrompts.strategic.current.length,
          isExplicitlySaved: updatedPrompts.strategic.isExplicitlySaved,
          lastUpdated: updatedPrompts.strategic.lastUpdated
        },
        follow_up: {
          length: updatedPrompts.follow_up.current.length,
          isExplicitlySaved: updatedPrompts.follow_up.isExplicitlySaved,
          lastUpdated: updatedPrompts.follow_up.lastUpdated
        },
        document: {
          length: updatedPrompts.document.current.length,
          isExplicitlySaved: updatedPrompts.document.isExplicitlySaved,
          lastUpdated: updatedPrompts.document.lastUpdated
        }
      });

      setPrompts(updatedPrompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los prompts',
        variant: 'destructive'
      });
    } finally {
      setLoadingPrompts(false);
    }
  };

  const savePrompt = async () => {
    const currentPrompt = prompts[activePromptMode].current;
    
    if (!currentPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'El prompt no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const key = `chat_${activePromptMode}_system_prompt`;
      
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key,
          value: { prompt: currentPrompt },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'key' });

      if (error) throw error;

      setPrompts(prev => ({
        ...prev,
        [activePromptMode]: {
          ...prev[activePromptMode],
          isExplicitlySaved: true,
          original: currentPrompt,
          lastUpdated: new Date().toISOString()
        }
      }));

      toast({
        title: 'Guardado',
        description: 'El prompt se actualizó correctamente'
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el prompt',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const restoreToDefault = async () => {
    try {
      setSaving(true);
      const key = `chat_${activePromptMode}_system_prompt`;
      
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key,
          value: { prompt: '' },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'key' });

      if (error) throw error;

      setPrompts(prev => ({
        ...prev,
        [activePromptMode]: {
          current: DEFAULT_PROMPTS[activePromptMode],
          original: DEFAULT_PROMPTS[activePromptMode],
          lastUpdated: new Date().toISOString(),
          isExplicitlySaved: false
        }
      }));

      toast({
        title: 'Restaurado',
        description: 'Se restauró el prompt por defecto'
      });
    } catch (error) {
      console.error('Error restoring prompt:', error);
      toast({
        title: 'Error',
        description: 'No se pudo restaurar el prompt',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (mode: PromptMode) => {
    const currentHasChanges = prompts[activePromptMode].current !== prompts[activePromptMode].original;
    
    if (currentHasChanges) {
      const confirm = window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de modo?');
      if (!confirm) return;
      
      setPrompts(prev => ({
        ...prev,
        [activePromptMode]: {
          ...prev[activePromptMode],
          current: prev[activePromptMode].original
        }
      }));
    }
    
    setActivePromptMode(mode);
  };

  const handlePromptChange = (value: string) => {
    setPrompts(prev => ({
      ...prev,
      [activePromptMode]: {
        ...prev[activePromptMode],
        current: value
      }
    }));
  };

  const handleCancel = () => {
    setPrompts(prev => ({
      ...prev,
      [activePromptMode]: {
        ...prev[activePromptMode],
        current: prev[activePromptMode].original
      }
    }));
  };

  const handleUseDefaultAsBase = () => {
    setPrompts(prev => ({
      ...prev,
      [activePromptMode]: {
        ...prev[activePromptMode],
        current: DEFAULT_PROMPTS[activePromptMode]
      }
    }));
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

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithDetails = await Promise.all(
        (profiles || []).map(async (profile) => {
          let company = null;
          if (profile.company_id) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('id, name, industry')
              .eq('id', profile.company_id)
              .single();
            company = companyData;
          }

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
      case 'emergente':
        return 'bg-red-500';
      case 'startup':
      case 'en_desarrollo':
        return 'bg-orange-500';
      case 'pyme':
        return 'bg-yellow-500';
      case 'corporate':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getMaturityLabel = (level: string | null) => {
    switch (level) {
      case 'idea':
        return 'Idea';
      case 'emergente':
        return 'Emergente';
      case 'startup':
        return 'Startup';
      case 'en_desarrollo':
        return 'En Desarrollo';
      case 'pyme':
        return 'PYME';
      case 'corporate':
        return 'Corporativo';
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

  const currentPromptData = prompts[activePromptMode];
  const hasChanges = currentPromptData.current !== currentPromptData.original;
  const unsavedChanges: Record<PromptMode, boolean> = {
    diagnosis_style: prompts.diagnosis_style.current !== prompts.diagnosis_style.original,
    diagnosis_core: prompts.diagnosis_core.current !== prompts.diagnosis_core.original,
    strategic: prompts.strategic.current !== prompts.strategic.original,
    follow_up: prompts.follow_up.current !== prompts.follow_up.original,
    document: prompts.document.current !== prompts.document.original
  };

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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="service">
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

              <Card variant="service">
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

              <Card variant="service">
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

          <TabsContent value="users" className="space-y-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <Card key={user.id} variant="content">
                    <div className="space-y-4">
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

          <TabsContent value="config" className="space-y-4">
            <Card variant="content">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Configuración de Prompts del Agente
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Edita los prompts que guían al agente de IA en cada modo de interacción
                  </p>
                </div>

                {loadingPrompts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <PromptModeSelector
                      activeMode={activePromptMode}
                      onChange={handleModeChange}
                      unsavedChanges={unsavedChanges}
                      promptsStatus={{
                        diagnosis_style: { isExplicitlySaved: prompts.diagnosis_style.isExplicitlySaved },
                        diagnosis_core: { isExplicitlySaved: prompts.diagnosis_core.isExplicitlySaved },
                        strategic: { isExplicitlySaved: prompts.strategic.isExplicitlySaved },
                        follow_up: { isExplicitlySaved: prompts.follow_up.isExplicitlySaved },
                        document: { isExplicitlySaved: prompts.document.isExplicitlySaved }
                      }}
                    />
                    
                    <PromptEditor
                      mode={activePromptMode}
                      value={currentPromptData.current}
                      defaultValue={DEFAULT_PROMPTS[activePromptMode]}
                      lastUpdated={currentPromptData.lastUpdated}
                      isExplicitlySaved={currentPromptData.isExplicitlySaved}
                      onChange={handlePromptChange}
                      onSave={savePrompt}
                      onRestore={restoreToDefault}
                      onCancel={handleCancel}
                      onViewDefault={() => setShowDefaultModal(true)}
                      hasChanges={hasChanges}
                      isSaving={saving}
                    />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PromptDefaultModal
        open={showDefaultModal}
        onOpenChange={setShowDefaultModal}
        mode={activePromptMode}
        defaultPrompt={DEFAULT_PROMPTS[activePromptMode]}
        onUseAsBase={handleUseDefaultAsBase}
      />
    </MainLayout>
  );
}