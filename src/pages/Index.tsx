import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useKPIs } from "@/hooks/useKPIs";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { TasksList } from "@/components/dashboard/TasksList";
import { KPIOverview } from "@/components/dashboard/KPIOverview";
import { KPITrendChart } from "@/components/dashboard/KPITrendChart";
import { KPIAreaChart } from "@/components/dashboard/KPIAreaChart";
import { KPIAlerts } from "@/components/dashboard/KPIAlerts";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, FolderOpen, TrendingUp, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProject, loading: projectLoading } = useProjectContext();
  const [latestDiagnosis, setLatestDiagnosis] = useState<any>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(true);
  
  const { 
    tasks, 
    loading: loadingTasks,
    getUpcomingTasks,
    getOverdueTasks,
    getTaskStats,
    updateTaskStatus 
  } = useTasks();
  
  const { 
    kpis,
    loading: loadingKPIs,
    getLatestKPIs,
    getKPIStats 
  } = useKPIs();

  useEffect(() => {
    const fetchLatestDiagnosis = async () => {
      if (!user || !currentProject?.id) {
        setLoadingDiagnosis(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('project_id', currentProject.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setLatestDiagnosis(data);
        }
      } catch (error) {
        console.error('Error fetching diagnosis:', error);
      } finally {
        setLoadingDiagnosis(false);
      }
    };

    fetchLatestDiagnosis();
  }, [user, currentProject?.id]);

  const handleTaskStatusUpdate = async (taskId: string, status: any) => {
    try {
      await updateTaskStatus(taskId, status);
      toast({
        title: "Tarea actualizada",
        description: "El estado de la tarea se ha actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive",
      });
    }
  };

  // Show landing page for logged out users
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
        <header className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-darker flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-bold text-xl">A</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-foreground leading-none tracking-tight">Alasha AI</h1>
                <span className="text-xs text-muted-foreground">Inteligencia Empresarial</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Iniciar Sesión
              </Button>
              <Button variant="gradient" onClick={() => navigate('/auth')}>
                Comenzar Ahora
              </Button>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
                <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
                  Inteligencia Empresarial
                  <span className="block mt-2 bg-gradient-to-r from-primary to-primary-darker bg-clip-text text-transparent">
                    Impulsada por IA
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Transforma tus datos en decisiones estratégicas. Diagnósticos profundos, análisis en tiempo real y planes de acción personalizados.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="gradient" onClick={() => navigate('/auth')} className="text-lg px-8 gap-2">
                    Comenzar Ahora
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8">
                    Ver Demo
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Todo lo que necesitas para crecer
                </h2>
                <p className="text-xl text-muted-foreground">
                  Herramientas poderosas para la gestión estratégica de tu negocio
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-6 hover:scale-105 transition-transform duration-200 animate-fade-in-up">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Diagnósticos Estratégicos
                  </h3>
                  <p className="text-muted-foreground">
                    Análisis profundo de todas las áreas de tu negocio con IA conversacional
                  </p>
                </Card>

                <Card className="p-6 hover:scale-105 transition-transform duration-200 animate-fade-in-up [animation-delay:100ms]">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Planes de Acción
                  </h3>
                  <p className="text-muted-foreground">
                    Estrategias personalizadas basadas en tus objetivos y recursos
                  </p>
                </Card>

                <Card className="p-6 hover:scale-105 transition-transform duration-200 animate-fade-in-up [animation-delay:200ms]">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    KPIs en Tiempo Real
                  </h3>
                  <p className="text-muted-foreground">
                    Monitoreo continuo con alertas inteligentes y recomendaciones
                  </p>
                </Card>

                <Card className="p-6 hover:scale-105 transition-transform duration-200 animate-fade-in-up [animation-delay:300ms]">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Gestión Documental
                  </h3>
                  <p className="text-muted-foreground">
                    Análisis automático de documentos y extracción de insights clave
                  </p>
                </Card>

                <Card className="p-6 hover:scale-105 transition-transform duration-200 animate-fade-in-up [animation-delay:400ms]">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Seguimiento de Tareas
                  </h3>
                  <p className="text-muted-foreground">
                    Organiza y prioriza con vistas Kanban, Gantt y gestión de dependencias
                  </p>
                </Card>

                <Card className="p-6 hover:scale-105 transition-transform duration-200 animate-fade-in-up [animation-delay:500ms]">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Consultoría IA 24/7
                  </h3>
                  <p className="text-muted-foreground">
                    Asistente estratégico disponible cuando lo necesites
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-foreground mb-6">
                ¿Listo para transformar tu negocio?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Únete a empresas que ya están tomando decisiones más inteligentes
              </p>
              <Button size="lg" variant="gradient" onClick={() => navigate('/auth')} className="text-lg px-12">
                Comenzar Gratis
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (loading || (user && (loadingDiagnosis || projectLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Si no hay proyecto, mostrar empty state
  if (user && !currentProject) {
    return (
      <MainLayout>
        <div className="container mx-auto p-comfortable flex items-center justify-center min-h-[70vh]">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡Bienvenido!</h2>
              <p className="text-muted-foreground">
                Comienza creando tu primer proyecto y realizando un diagnóstico personalizado con ayuda de IA
              </p>
            </div>
            <Button onClick={() => navigate('/chat-diagnosis')} size="lg" className="gap-2">
              <FolderOpen className="h-5 w-5" />
              Crear Primer Proyecto
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const taskStats = getTaskStats();
  const kpiStats = getKPIStats();
  const upcomingTasks = getUpcomingTasks();
  const overdueTasks = getOverdueTasks();
  const latestKPIs = getLatestKPIs();
  
  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  return (
    <MainLayout>
      <div className="container mx-auto p-comfortable">
        <div className="mb-comfortable">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Dashboard</h2>
              <p className="text-base text-muted-foreground">
                Resumen de tu progreso y métricas principales
              </p>
            </div>
            {currentProject && (
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg">
                <FolderOpen className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Proyecto:</span>
                  <span className="font-semibold ml-2">{currentProject.name}</span>
                </div>
                <Badge variant={currentProject.status === 'active' ? 'success' : 'default'} className="ml-2">
                  {currentProject.status === 'active' ? 'Activo' : currentProject.status === 'completed' ? 'Completado' : 'Archivado'}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-standard mb-comfortable">
          <KPICard 
            title="Progreso General" 
            value={completionRate.toString()} 
            unit="%" 
          />
          <KPICard 
            title="Tareas Completadas" 
            value={taskStats.completed.toString()} 
            unit={`de ${taskStats.total}`} 
          />
          <KPICard 
            title="KPIs en Meta" 
            value={kpiStats.onTarget.toString()} 
            unit={`de ${kpiStats.total}`} 
          />
          <KPICard 
            title="Tareas Atrasadas" 
            value={overdueTasks.length.toString()} 
            unit="tareas" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-standard">
          <div className="lg:col-span-2">
            <Card variant="service">
              <h3 className="text-base font-semibold text-foreground mb-4">Próximas Tareas</h3>
              {loadingTasks ? (
                <div className="text-sm text-muted-foreground">Cargando tareas...</div>
              ) : upcomingTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No hay tareas próximas
                </div>
              ) : (
                <TasksList 
                  tasks={upcomingTasks.slice(0, 8)} 
                  onUpdateStatus={handleTaskStatusUpdate}
                />
              )}
              {upcomingTasks.length > 0 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-4"
                  onClick={() => navigate('/tasks')}
                >
                  Ver todas las tareas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </Card>
          </div>

          <div className="space-y-standard">
            <Card variant="content">
              {latestDiagnosis ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">Diagnóstico</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">v{latestDiagnosis.version}</Badge>
                      <Badge variant="default">Completado</Badge>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    {latestDiagnosis.version > 1 && (
                      <div className="text-xs text-muted-foreground pb-2 border-b border-border">
                        Actualizado hace {Math.floor((Date.now() - new Date(latestDiagnosis.updated_at || latestDiagnosis.created_at).getTime()) / (1000 * 60 * 60 * 24))} días
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Estrategia</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.strategy_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Operaciones</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.operations_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Finanzas</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.finance_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Marketing</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.marketing_score}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nivel: <span className="font-medium text-foreground capitalize">{latestDiagnosis.maturity_level}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => navigate(`/diagnosis/${latestDiagnosis.id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Ver Completo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => navigate('/chat-diagnosis')}
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      Actualizar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-foreground mb-2">Diagnóstico</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Realiza un diagnóstico de tu negocio
                  </p>
                  <Button 
                    onClick={() => navigate('/chat-diagnosis')}
                    size="sm"
                    className="w-full"
                  >
                    Iniciar Diagnóstico
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </Card>

            {overdueTasks.length > 0 && (
              <Card variant="service" className="border-destructive">
                <h3 className="text-base font-semibold text-destructive mb-4">
                  Tareas Atrasadas ({overdueTasks.length})
                </h3>
                <TasksList 
                  tasks={overdueTasks.slice(0, 3)} 
                  onUpdateStatus={handleTaskStatusUpdate}
                />
              </Card>
            )}
          </div>
        </div>

        {/* Sección de KPIs y Gráficas */}
        {latestKPIs.length > 0 && (
          <div className="mt-comfortable space-y-comfortable">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Análisis de KPIs</h3>
              </div>
              <Button 
                variant="ghost"
                onClick={() => navigate('/plans')}
              >
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {loadingKPIs ? (
              <div className="text-sm text-muted-foreground">Cargando KPIs...</div>
            ) : (
              <>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-standard">
                    <TabsTrigger value="overview">Vista General</TabsTrigger>
                    <TabsTrigger value="trends">Tendencias</TabsTrigger>
                    <TabsTrigger value="alerts">Alertas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-standard">
                    <KPIOverview kpis={latestKPIs.slice(0, 6)} />
                  </TabsContent>
                  
                  <TabsContent value="trends" className="space-y-standard">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-standard">
                      <KPITrendChart 
                        kpis={kpis.slice(0, 20)} 
                        title="Evolución Temporal de KPIs"
                      />
                      <KPIAreaChart 
                        kpis={latestKPIs} 
                        title="Comparación por Área"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="alerts">
                    <KPIAlerts />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
