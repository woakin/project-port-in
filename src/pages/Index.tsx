import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useKPIs } from "@/hooks/useKPIs";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { KPICardSkeleton } from "@/components/shared/KPICardSkeleton";
import { TasksListSkeleton } from "@/components/shared/TaskCardSkeleton";
import { TasksList } from "@/components/dashboard/TasksList";
import { TaskDetails } from "@/components/tasks/TaskDetails";
import { MainKPIChart } from "@/components/kpi/MainKPIChart";
import { DiagnosticHeroCard } from "@/components/dashboard/DiagnosticHeroCard";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FolderOpen, Activity, Compass, Rocket, Target, TrendingUp, DollarSign, Settings, Code, X, CheckCircle, Quote, FileQuestion, FileCheck, BarChart, Sparkles, Lightbulb, Cog, Brain, Globe, Building2, Zap, MessageSquare, Mic } from "lucide-react";
import { IconCircle } from "@/components/shared/IconCircle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task.types";
import alashaLogo from "@/assets/alasha-logo.png";
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    currentProject,
    loading: projectLoading
  } = useProjectContext();
  const [latestDiagnosis, setLatestDiagnosis] = useState<any>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    tasks,
    loading: loadingTasks,
    getUpcomingTasks,
    getOverdueTasks,
    getTaskStats,
    updateTaskStatus,
    refetch: refetchTasks
  } = useTasks();
  const {
    kpis,
    loading: loadingKPIs,
    getLatestKPIs,
    getKPIStats,
    getMainKPI,
    getKPIHistory,
    getKPITrend
  } = useKPIs();
  useEffect(() => {
    const fetchLatestDiagnosis = async () => {
      if (!user || !currentProject?.id) {
        setLoadingDiagnosis(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('diagnoses').select('*').eq('project_id', currentProject.id).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
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
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleTaskStatusUpdate = async (taskId: string, status: any) => {
    try {
      await updateTaskStatus(taskId, status);
      toast({
        title: "Tarea actualizada",
        description: "El estado de la tarea se ha actualizado correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive"
      });
    }
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedTask(null);
    refetchTasks();
  };

  // Show landing page for logged out users
  if (!loading && !user) {
    return <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md">
                <img src={alashaLogo} alt="Alasha AI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-foreground leading-none tracking-tight">Alasha AI</h1>
                <span className="text-xs text-muted-foreground">Inteligencia Empresarial</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate('/auth?tab=login')}>
                Iniciar Sesión
              </Button>
              <Button variant="default" onClick={() => navigate('/auth?tab=signup')} className="bg-secondary hover:bg-secondary-light">
                Comenzar Ahora
              </Button>
            </div>
          </div>
        </header>

        <main>
          {/* 1. Hero Section */}
          <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(135deg,hsl(210_60%_25%)_0%,hsl(170_45%_45%)_100%)] text-white overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
            </div>
            
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center max-w-4xl mx-auto">
                {/* Eyebrow text */}
                <p className="text-sm sm:text-base text-white/70 mb-4 font-medium tracking-wide uppercase">
                  Escalar un negocio no se hace solo
                </p>

                {/* Short, punchy H1 */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-[1.15]">
                  <span className="text-secondary">Alasha AI</span>: Tu compañero de ruta para crecer con propósito
                </h1>
                
                {/* Subtitle */}
                <p className="text-base sm:text-lg text-white/80 mb-10 leading-relaxed max-w-2xl mx-auto">
                  Te acompañamos paso a paso con inteligencia, estructura y claridad para avanzar sin perder el rumbo.
                </p>
                
                {/* CTA buttons with consistent styling */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="white" 
                    onClick={() => navigate('/auth')} 
                    className="text-lg px-8"
                  >
                    Empieza tu ascenso →
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate('/auth')} 
                    className="border-2 border-white bg-transparent text-white hover:bg-white/10 text-lg px-8"
                  >
                    Ver cómo te acompañamos →
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. La claridad que tu negocio necesita */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">La dirección que tu negocio necesita para avanzar con confianza</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Muchos fundadores enfrentan su crecimiento a prueba y error. Alasha AI te da foco, estructura y acompañamiento real para avanzar con seguridad.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Activity} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Diagnóstico inteligente
                  </h3>
                  <p className="text-muted-foreground">Descubre tu punto de partida.</p>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Compass} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Ruta personalizada</h3>
                  <p className="text-muted-foreground">Diseña tu plan de crecimiento con precisión.</p>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Rocket} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Progreso visible</h3>
                  <p className="text-muted-foreground">Mide tu avance y ajusta con datos reales.</p>
                </div>
              </div>

              <p className="text-center text-lg text-muted-foreground font-medium">No es consultoría. Es acompañamiento inteligente para crecer con propósito.</p>
            </div>
          </section>

          {/* 3. Todo tu negocio en un solo lugar */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">Todo tu crecimiento en un solo lugar</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Diseñado para líderes que quieren escalar con método, sin perder su esencia.</p>
              </div>

              <div className="grid gap-6 mb-8">
                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={Target} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Estrategia</h3>
                    <p className="text-muted-foreground">Define tu ruta y enfoca tus esfuerzos.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={TrendingUp} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Marketing y ventas</h3>
                    <p className="text-muted-foreground">Identifica los canales que realmente te impulsan.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={DollarSign} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Finanzas</h3>
                    <p className="text-muted-foreground">Entiende tus números antes de dar el siguiente paso.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={Settings} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Operaciones</h3>
                    <p className="text-muted-foreground">Estructura tu equipo y procesos para sostener el crecimiento.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={Code} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Tecnología</h3>
                    <p className="text-muted-foreground">Integra herramientas que te ayuden a avanzar más lejos.</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-lg text-muted-foreground font-medium italic">Pasa de “no saber por dónde empezar” a “tener una ruta clara hacia tu cima”.</p>
            </div>
          </section>

          {/* 4. Crece como los grandes */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">Escala como los grandes, manteniendo tu esencia</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Alasha AI analiza tu negocio, aprende de tus resultados y te guía paso a paso hacia el crecimiento que imaginas.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-card/50 p-8 rounded-xl border-2 border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <X className="h-8 w-8 text-destructive" />
                    <h3 className="text-2xl font-bold text-foreground">Antes</h3>
                  </div>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">✗</span>
                      <span>Intuición</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">✗</span>
                      <span>Dispersión</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">✗</span>
                      <span>Poca visibilidad</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-secondary/10 p-8 rounded-xl border-2 border-secondary">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-8 w-8 text-secondary" />
                    <h3 className="text-2xl font-bold text-foreground">Después</h3>
                  </div>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                      <span>Claridad</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                      <span>Foco</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                      <span>Equipo alineado</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                <div className="bg-muted/50 border-l-4 border-secondary p-8 rounded-r-xl">
                  <Quote className="h-8 w-8 text-secondary mb-4" />
                  <p className="text-2xl font-semibold text-foreground italic">“No se trata de más tiempo, sino de avanzar con propósito.”</p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Cómo funciona */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">Cómo te acompañamos en el camino</h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <IconCircle icon={FileQuestion} size="lg" />
                      <div className="absolute -top-2 -right-2 bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                        1
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Descubre tu punto de partida</h3>
                  <p className="text-muted-foreground text-sm">Con un diagnóstico interactivo.</p>
                </div>

                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <IconCircle icon={FileCheck} size="lg" />
                      <div className="absolute -top-2 -right-2 bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                        2
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Traza tu ruta personalizada</h3>
                  <p className="text-muted-foreground text-sm">Plan de acción hecho para tu realidad.</p>
                </div>

                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <IconCircle icon={BarChart} size="lg" />
                      <div className="absolute -top-2 -right-2 bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                        3
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Avanza paso a paso</h3>
                  <p className="text-muted-foreground text-sm">Ejecuta, mide y ajusta con claridad.</p>
                </div>

                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <IconCircle icon={Sparkles} size="lg" />
                      <div className="absolute -top-2 -right-2 bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                        4
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Mejora con inteligencia</h3>
                  <p className="text-muted-foreground text-sm">La IA aprende de tus resultados para impulsarte más lejos.</p>
                </div>
              </div>

              <div className="text-center">
                <Button size="lg" variant="gradient" onClick={() => navigate('/auth')} className="text-lg px-8">Crea tu plan de ascenso en menos de 5 minutos<ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </section>

          {/* 6. Diseñado para escalar contigo */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">Diseñado para acompañarte en cada etapa</h2>
                <p className="text-xl text-muted-foreground">
                  Desde una idea en servilleta hasta una PyME que factura millones.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Lightbulb} size="lg" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Founder
                  </h3>
                  <p className="text-muted-foreground mb-6">Estructura tu visión desde el inicio.</p>
                  <Button variant="outline-secondary" onClick={() => navigate('/auth')}>
                    Empezar ahora
                  </Button>
                </div>

                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Cog} size="lg" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Startup
                  </h3>
                  <p className="text-muted-foreground mb-6">Encuentra tracción y escala con método.</p>
                  <Button variant="outline-secondary" onClick={() => navigate('/auth')}>
                    Empezar ahora
                  </Button>
                </div>

                <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={TrendingUp} size="lg" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    PyME
                  </h3>
                  <p className="text-muted-foreground mb-6">Crece con eficiencia y control, sin perder calidad.</p>
                  <Button variant="outline-secondary" onClick={() => navigate('/auth')}>
                    Empezar ahora
                  </Button>
                </div>
              </div>

              <p className="text-center text-lg text-muted-foreground font-medium">No importa en qué parte del camino estés, Alasha AI avanza contigo.</p>
            </div>
          </section>

          {/* 7. Un copiloto de verdad */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/5">
            <div className="max-w-5xl mx-auto text-center">
              <div className="flex justify-center mb-8">
                <IconCircle icon={Brain} size="lg" />
              </div>
              
              <h2 className="text-4xl font-bold text-foreground mb-6">Un compañero de ruta de verdad</h2>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">Cada plan, tarea y métrica se adapta a tu realidad. Alasha AI aprende de tu negocio para darte dirección, foco y acompañamiento real.</p>

              <p className="text-2xl font-semibold text-foreground">No es IA por moda. Es IA para avanzar con propósito.</p>
            </div>
          </section>

          {/* 8. Cierre y CTA Final */}
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(135deg,hsl(210_60%_25%)_0%,hsl(170_45%_45%)_100%)] text-white">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6">El futuro de tu negocio empieza con dirección</h2>
              <p className="text-2xl text-white/90 mb-10">Empieza hoy tu camino hacia el crecimiento que imaginas.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="white" onClick={() => navigate('/auth')} className="text-lg px-12">Empieza tu camino →</Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="border-2 border-white bg-transparent text-white hover:bg-white/10 text-lg px-12">Ver planes en acción →</Button>
              </div>
            </div>
          </section>
        </main>
      </div>;
  }
  if (loading || user && (loadingDiagnosis || projectLoading)) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>;
  }

  // Si no hay proyecto, mostrar empty state
  if (user && !currentProject) {
    return <MainLayout>
        <div className="h-full overflow-y-auto">
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
              <Sparkles className="h-5 w-5" />
              Crear Primer Proyecto
            </Button>
          </div>
          </div>
        </div>
      </MainLayout>;
  }
  const taskStats = getTaskStats();
  const kpiStats = getKPIStats();
  const upcomingTasks = getUpcomingTasks();
  const overdueTasks = getOverdueTasks();
  const latestKPIs = getLatestKPIs();
  const completionRate = taskStats.total > 0 ? Math.round(taskStats.completed / taskStats.total * 100) : 0;
  return <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto p-comfortable">
        <div className="mb-comfortable">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Dashboard</h2>
              <p className="text-base text-muted-foreground">
                Resumen de tu progreso y métricas principales
              </p>
            </div>
            {currentProject && <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <FolderOpen className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Proyecto:</span>
                  <span className="font-semibold ml-2">{currentProject.name}</span>
                </div>
                <Badge variant={currentProject.status === 'active' ? 'success' : 'default'} className="ml-2">
                  {currentProject.status === 'active' ? 'Activo' : currentProject.status === 'completed' ? 'Completado' : 'Archivado'}
                </Badge>
              </div>}
          </div>
        </div>

        {/* Diagnostic Hero Card - Full Width */}
        {latestDiagnosis ? <div className="mb-comfortable">
            <DiagnosticHeroCard diagnosis={latestDiagnosis} />
          </div> : <div className="mb-comfortable">
            <Card variant="content" className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 border-2 border-primary/20">
              <div className="text-center py-16 px-8">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Descubre el potencial de tu negocio
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Completa tu diagnóstico en 10 minutos y obtén insights personalizados con IA
                </p>
                
                {/* Preview de lo que obtendrán */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
                  <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Score por área</p>
                    <p className="text-xs text-muted-foreground mt-1">Estrategia, operaciones, finanzas</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Plan de acción</p>
                    <p className="text-xs text-muted-foreground mt-1">Recomendaciones priorizadas</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">KPIs y métricas</p>
                    <p className="text-xs text-muted-foreground mt-1">Seguimiento en tiempo real</p>
                  </div>
                </div>

                {/* CTAs prominentes */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={() => navigate('/chat-diagnosis')} size="lg" className="text-lg px-8 py-6 h-auto">
                    <MessageSquare className="mr-3 h-6 w-6" />
                    Diagnóstico por Chat
                  </Button>
                  <Button onClick={() => navigate('/voice-diagnosis')} size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-2">
                    <Mic className="mr-3 h-6 w-6" />
                    Diagnóstico por Voz
                  </Button>
                </div>
              </div>
            </Card>
          </div>}

        {/* Main KPI + Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-standard mb-comfortable">
          {/* Left Column: Main KPI (2/3 width) */}
          <div className="lg:col-span-2">
            {(() => {
              const mainKPI = getMainKPI();
              if (mainKPI) {
                const history = getKPIHistory(mainKPI.name);
                const trend = getKPITrend(mainKPI.name);
                return (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground mb-1">KPI Principal</h2>
                        <p className="text-sm text-muted-foreground">Evolución histórica de tu indicador clave</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/kpis')}>
                        Ver todos los KPIs
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    {loadingKPIs ? (
                      <div className="text-sm text-muted-foreground">Cargando KPI...</div>
                    ) : (
                      <MainKPIChart kpi={mainKPI} history={history} trend={trend} />
                    )}
                  </div>
                );
              }
              return (
                <Card variant="content" className="h-full flex items-center justify-center">
                  <div className="text-center py-12 px-6">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Configura tu KPI Principal
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecciona el indicador más importante para tu negocio
                    </p>
                    <Button onClick={() => navigate('/kpis')} className="gap-2">
                      <Target className="h-4 w-4" />
                      Ir a KPIs
                    </Button>
                  </div>
                </Card>
              );
            })()}
          </div>

          {/* Right Column: Quick Metrics (1/3 width) */}
          <div className="space-y-standard">
            {loadingKPIs || loadingTasks ? (
              <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
              </>
            ) : (
              <>
                <KPICard 
                  title="Progreso General" 
                  value={completionRate.toString()} 
                  unit="%" 
                  change={completionRate > 0 ? completionRate : undefined}
                  trend={completionRate >= 75 ? 'up' : completionRate >= 50 ? 'stable' : 'down'}
                />
                <KPICard 
                  title="Tareas Completadas" 
                  value={taskStats.completed.toString()} 
                  unit={`de ${taskStats.total}`}
                  change={taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}
                  trend={taskStats.completed > taskStats.pending ? 'up' : 'down'}
                />
                <KPICard 
                  title="KPIs en Meta" 
                  value={kpiStats.onTarget.toString()} 
                  unit={`de ${kpiStats.total}`}
                  change={kpiStats.total > 0 ? Math.round((kpiStats.onTarget / kpiStats.total) * 100) : 0}
                  trend={kpiStats.onTarget >= kpiStats.total / 2 ? 'up' : 'down'}
                />
                <KPICard 
                  title="Tareas Atrasadas" 
                  value={overdueTasks.length.toString()} 
                  unit="tareas"
                  change={overdueTasks.length > 0 ? -Math.min(overdueTasks.length * 10, 100) : 0}
                  trend={overdueTasks.length > 0 ? 'down' : 'up'}
                />
              </>
            )}
          </div>
        </div>

        {/* Tasks Section - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-standard">
          <div className="lg:col-span-2">
            <Card variant="service">
              <h3 className="text-base font-semibold text-foreground mb-4">Próximas Tareas</h3>
              {loadingTasks ? (
                <TasksListSkeleton />
              ) : upcomingTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No hay tareas próximas
                </div>
              ) : (
                <TasksList 
                  tasks={upcomingTasks.slice(0, 8)} 
                  onUpdateStatus={handleTaskStatusUpdate}
                  onTaskClick={handleTaskClick}
                />
              )}
              {upcomingTasks.length > 0 && (
                <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/tasks')}>
                  Ver todas las tareas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </Card>
          </div>

          <div className="space-y-standard">
            {overdueTasks.length > 0 && (
              <Card variant="service" className="border-destructive">
                <h3 className="text-base font-semibold text-destructive mb-4">
                  Tareas Atrasadas ({overdueTasks.length})
                </h3>
                {loadingTasks ? (
                  <TasksListSkeleton />
                ) : (
                  <TasksList 
                    tasks={overdueTasks.slice(0, 3)} 
                    onUpdateStatus={handleTaskStatusUpdate}
                    onTaskClick={handleTaskClick}
                  />
                )}
              </Card>
            )}
          </div>
        </div>

        </div>
      </div>

      <TaskDetails 
        task={selectedTask}
        open={detailsOpen}
        onOpenChange={handleDetailsClose}
        onStatusUpdate={refetchTasks}
      />
    </MainLayout>;
};
export default Index;