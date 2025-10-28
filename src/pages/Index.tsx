import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useKPIs } from "@/hooks/useKPIs";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { TasksList } from "@/components/dashboard/TasksList";
import { KPIOverview } from "@/components/dashboard/KPIOverview";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    const fetchLatestDiagnosis = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('user_id', user.id)
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
  }, [user]);

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

  if (loading || loadingDiagnosis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
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
          <h2 className="text-2xl font-semibold text-foreground mb-2">Dashboard</h2>
          <p className="text-base text-muted-foreground">
            Resumen de tu progreso y métricas principales
          </p>
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
            <Card variant="content">
              {latestDiagnosis ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">Último Diagnóstico</h3>
                    <Badge variant="default">Completado</Badge>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-3 gap-3">
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
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nivel de madurez: <span className="font-medium text-foreground capitalize">{latestDiagnosis.maturity_level}</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => navigate(`/diagnosis/${latestDiagnosis.id}`)}
                      variant="default"
                    >
                      Ver Diagnóstico Completo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => navigate('/chat-diagnosis')}
                      variant="outline"
                    >
                      Nuevo Diagnóstico
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Plan de Acción Activo</h3>
                    <Badge variant="default">En progreso</Badge>
                  </div>
                  <p className="text-base text-muted-foreground">
                    Aún no tienes un plan de acción activo. Comienza realizando un diagnóstico de tu negocio.
                  </p>
                  <Button 
                    onClick={() => navigate('/chat-diagnosis')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit"
                  >
                    Iniciar Diagnóstico
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </Card>
          </div>

          <div className="space-y-standard">
            <Card variant="service">
              <h3 className="text-base font-semibold text-foreground mb-4">Próximas Tareas</h3>
              {loadingTasks ? (
                <div className="text-sm text-muted-foreground">Cargando tareas...</div>
              ) : (
                <TasksList 
                  tasks={upcomingTasks} 
                  onUpdateStatus={handleTaskStatusUpdate}
                />
              )}
              {upcomingTasks.length > 0 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-4"
                  onClick={() => navigate('/plans')}
                >
                  Ver todas las tareas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
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

        {/* Sección de KPIs */}
        {latestKPIs.length > 0 && (
          <div className="mt-comfortable">
            <div className="flex items-center justify-between mb-standard">
              <h3 className="text-xl font-semibold text-foreground">KPIs Principales</h3>
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
              <KPIOverview kpis={latestKPIs.slice(0, 6)} />
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
