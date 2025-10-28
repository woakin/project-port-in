import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Calendar, BarChart3, CheckCircle, ListTodo, FileText, TrendingUp } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';

interface ProjectMetrics {
  diagnoses: number;
  tasks: number;
  tasksCompleted: number;
  kpis: number;
  lastActivity: string | null;
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, loading, setCurrentProject } = useProjectContext();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [projectMetrics, setProjectMetrics] = useState<Record<string, ProjectMetrics>>({});

  useEffect(() => {
    if (projects.length > 0) {
      fetchProjectMetrics();
    }
  }, [projects]);

  const fetchProjectMetrics = async () => {
    const metrics: Record<string, ProjectMetrics> = {};

    for (const project of projects) {
      // Fetch diagnoses count
      const { count: diagnosesCount } = await supabase
        .from('diagnoses')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);

      // Fetch tasks
      const { data: planData } = await supabase
        .from('action_plans')
        .select(`
          plan_areas (
            plan_objectives (
              tasks (id, status, updated_at)
            )
          )
        `)
        .eq('project_id', project.id)
        .eq('status', 'active')
        .maybeSingle();

      const allTasks = planData?.plan_areas?.flatMap((a: any) =>
        a.plan_objectives?.flatMap((o: any) => o.tasks || []) || []
      ) || [];

      const tasksCompleted = allTasks.filter((t: any) => t.status === 'completed').length;

      // Get last activity
      const lastTaskUpdate = allTasks.reduce((latest: string | null, task: any) => {
        if (!task.updated_at) return latest;
        if (!latest || new Date(task.updated_at) > new Date(latest)) {
          return task.updated_at;
        }
        return latest;
      }, null);

      // Fetch KPIs count
      const { count: kpisCount } = await supabase
        .from('kpis')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', project.company_id);

      metrics[project.id] = {
        diagnoses: diagnosesCount || 0,
        tasks: allTasks.length,
        tasksCompleted,
        kpis: kpisCount || 0,
        lastActivity: lastTaskUpdate
      };
    }

    setProjectMetrics(metrics);
  };

  const handleSelectProject = (project: any) => {
    setCurrentProject(project);
    navigate('/');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando proyectos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-comfortable">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Proyectos</h1>
              <p className="text-muted-foreground mt-2">
                Gestiona todos tus proyectos y sus métricas principales
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>

        {projects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-6">
              Crea tu primer proyecto para comenzar a trabajar
            </p>
            <Button onClick={() => navigate('/chat-diagnosis')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Proyecto
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const metrics = projectMetrics[project.id];
              const completionRate = metrics?.tasks > 0 
                ? Math.round((metrics.tasksCompleted / metrics.tasks) * 100)
                : 0;

              return (
                <Card
                  key={project.id}
                  className="p-6 hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer group"
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {project.name}
                        </h3>
                      </div>
                      <Badge
                        variant={
                          project.status === 'active'
                            ? 'default'
                            : project.status === 'completed'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {project.status === 'active'
                          ? 'Activo'
                          : project.status === 'completed'
                          ? 'Completado'
                          : 'Archivado'}
                      </Badge>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Métricas principales */}
                    {metrics && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <FileText className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Diagnósticos</span>
                            <span className="text-sm font-semibold">{metrics.diagnoses}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <BarChart3 className="h-4 w-4 text-blue-500" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">KPIs</span>
                            <span className="text-sm font-semibold">{metrics.kpis}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <ListTodo className="h-4 w-4 text-orange-500" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Tareas</span>
                            <span className="text-sm font-semibold">{metrics.tasks}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Completadas</span>
                            <span className="text-sm font-semibold">{metrics.tasksCompleted}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progreso */}
                    {metrics && metrics.tasks > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progreso del plan</span>
                          <span className="font-semibold">{completionRate}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(project.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {metrics?.lastActivity && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>
                            Actualizado{' '}
                            {new Date(metrics.lastActivity).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      )}
                      {project.is_default && (
                        <Badge variant="outline" className="text-xs">
                          Por defecto
                        </Badge>
                      )}
                    </div>

                    <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Abrir Proyecto
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </MainLayout>
  );
}
