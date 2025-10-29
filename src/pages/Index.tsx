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
import { 
  ArrowRight, 
  FolderOpen,
  Activity, 
  Compass, 
  Rocket,
  Target,
  TrendingUp,
  DollarSign,
  Settings,
  Code,
  X,
  CheckCircle,
  Quote,
  FileQuestion,
  FileCheck,
  BarChart,
  Sparkles,
  Lightbulb,
  Cog,
  Brain,
  Globe,
  Building2,
  Zap
} from "lucide-react";
import { IconCircle } from "@/components/shared/IconCircle";
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
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[linear-gradient(135deg,hsl(210_60%_25%),hsl(170_45%_45%))] flex items-center justify-center shadow-md">
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
              <Button variant="default" onClick={() => navigate('/auth')} className="bg-secondary hover:bg-secondary-light">
                Comenzar Ahora
              </Button>
            </div>
          </div>
        </header>

        <main>
          {/* 1. Hero Section */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(135deg,hsl(210_60%_25%)_0%,hsl(170_45%_45%)_100%)] text-white overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
                  Construye. Ejecuta. Mide. Crece.
                </h1>
                <p className="text-xl text-white/90 mb-10 leading-relaxed">
                  Tu plataforma de crecimiento todo-en-uno para startups y PYMEs que quieren dominar su mercado, no solo sobrevivir.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="white"
                    onClick={() => navigate('/auth')} 
                    className="text-lg px-8"
                  >
                    👉 Empieza gratis
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate('/auth')} 
                    className="border-2 border-white bg-transparent text-white hover:bg-white/10 text-lg px-8"
                  >
                    Descubre cómo funciona →
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. La claridad que tu negocio necesita */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  La claridad que tu negocio necesita
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  La mayoría de los negocios crecen a prueba y error. Alasha AI te da estructura, foco y dirección para avanzar con confianza.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Activity} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Diagnóstico inteligente
                  </h3>
                  <p className="text-muted-foreground">
                    Entiende en qué etapa estás y qué necesitas para avanzar.
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Compass} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Plan personalizado
                  </h3>
                  <p className="text-muted-foreground">
                    Acciones concretas diseñadas para tu realidad específica.
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <IconCircle icon={Rocket} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Seguimiento real
                  </h3>
                  <p className="text-muted-foreground">
                    Mide progreso y ajusta en tiempo real con datos precisos.
                  </p>
                </div>
              </div>

              <p className="text-center text-lg text-muted-foreground font-medium">
                No es consultoría tradicional. Es crecimiento con precisión.
              </p>
            </div>
          </section>

          {/* 3. Todo tu negocio en un solo lugar */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Todo tu negocio en un solo lugar
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Diseñado para founders, equipos pequeños y empresas familiares que buscan profesionalizarse sin perder velocidad.
                </p>
              </div>

              <div className="grid gap-6 mb-8">
                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={Target} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Estrategia</h3>
                    <p className="text-muted-foreground">Define tus objetivos y prioriza lo que realmente mueve el negocio.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={TrendingUp} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Marketing y ventas</h3>
                    <p className="text-muted-foreground">Identifica canales rentables y optimiza tu embudo.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={DollarSign} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Finanzas</h3>
                    <p className="text-muted-foreground">Visualiza tus números y toma decisiones con datos.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={Settings} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Operaciones</h3>
                    <p className="text-muted-foreground">Estructura procesos, equipos y tareas clave.</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow flex gap-6 items-start">
                  <IconCircle icon={Code} size="md" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Tecnología</h3>
                    <p className="text-muted-foreground">Integra herramientas sin complicarte.</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-lg text-muted-foreground font-medium italic">
                Pasa de "necesitamos ordenarnos" a "sabemos exactamente qué hacer".
              </p>
            </div>
          </section>

          {/* 4. Crece como los grandes */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Crece como los grandes (sin serlo todavía)
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Alasha AI aprende de tu negocio, analiza tus resultados y te guía para dar el siguiente paso.
                </p>
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
                      <span>Decisiones por intuición</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">✗</span>
                      <span>Tareas dispersas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive mt-1">✗</span>
                      <span>Sin visibilidad real</span>
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
                      <span>Claridad total</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                      <span>Plan medible</span>
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
                  <p className="text-2xl font-semibold text-foreground italic">
                    "No necesitas más tiempo. Necesitas mejor dirección."
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Cómo funciona */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Cómo funciona
                </h2>
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
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Diagnostica tu negocio
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Con un cuestionario interactivo personalizado.
                  </p>
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
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Recibe tu plan
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Un plan de acción personalizado para tu realidad.
                  </p>
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
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Ejecuta y mide
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Cada avance en tu dashboard en tiempo real.
                  </p>
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
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Optimiza con IA
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Inteligencia que aprende de tus resultados.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  size="lg"
                  variant="gradient"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8"
                >
                  Crea tu plan en menos de 5 minutos
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </section>

          {/* 6. Diseñado para escalar contigo */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Diseñado para escalar contigo
                </h2>
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
                  <p className="text-muted-foreground mb-6">
                    Estructura tu visión y lanza con foco desde el día uno.
                  </p>
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
                  <p className="text-muted-foreground mb-6">
                    Mejora tu tracción y encuentra product-market fit rápido.
                  </p>
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
                  <p className="text-muted-foreground mb-6">
                    Escala con eficiencia y control sin perder calidad.
                  </p>
                  <Button variant="outline-secondary" onClick={() => navigate('/auth')}>
                    Empezar ahora
                  </Button>
                </div>
              </div>

              <p className="text-center text-lg text-muted-foreground font-medium">
                Sin importar el tamaño de tu negocio, Alasha AI se adapta a tu velocidad.
              </p>
            </div>
          </section>

          {/* 7. Un copiloto de verdad */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/5">
            <div className="max-w-5xl mx-auto text-center">
              <div className="flex justify-center mb-8">
                <IconCircle icon={Brain} size="lg" />
              </div>
              
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Un copiloto de verdad
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
                Cada plan, tarea y métrica se ajusta a tus resultados. Alasha AI no te da respuestas genéricas; aprende de tus documentos, números y decisiones para darte una ruta real de crecimiento.
              </p>

              <p className="text-2xl font-semibold text-foreground">
                No es IA por moda. Es IA con propósito.
              </p>
            </div>
          </section>

          {/* 8. Cierre y CTA Final */}
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(135deg,hsl(210_60%_25%)_0%,hsl(170_45%_45%)_100%)] text-white">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6">
                El futuro de tu negocio empieza con claridad
              </h2>
              <p className="text-2xl text-white/90 mb-10">
                Crea tu plan de crecimiento personalizado hoy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  variant="white"
                  onClick={() => navigate('/auth')} 
                  className="text-lg px-12"
                >
                  Empieza gratis →
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/auth')} 
                  className="border-2 border-white bg-transparent text-white hover:bg-white/10 text-lg px-12"
                >
                  Ver ejemplos de planes
                </Button>
              </div>
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
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
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
