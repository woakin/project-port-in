import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/types/task.types";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskGantt } from "@/components/tasks/TaskGantt";
import { TaskDetails } from "@/components/tasks/TaskDetails";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, KanbanSquare, GanttChart } from "lucide-react";
import { useAIAssistant } from "@/contexts/AIAssistantContext";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { updateContext } = useAIAssistant();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Obtener plan activo
      const { data: activePlan } = await supabase
        .from('action_plans')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('status', 'active')
        .single();

      if (!activePlan) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Obtener todas las tareas del plan activo
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          plan_objectives!inner (
            title,
            plan_areas!inner (
              name,
              plan_id
            )
          )
        `)
        .eq('plan_objectives.plan_areas.plan_id', activePlan.id)
        .order('priority', { ascending: true });

      if (tasksError) throw tasksError;

      const tasksWithDetails = (tasksData || []) as Task[];
      setTasks(tasksWithDetails);
      
      // Update AI context with tasks data
      updateContext({
        data: {
          tasks: tasksWithDetails.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            estimated_effort: t.estimated_effort,
            due_date: t.due_date,
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (tasks.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No hay tareas disponibles</h2>
            <p className="text-muted-foreground mb-6">
              Primero necesitas crear un plan de acción para ver las tareas
            </p>
            <Button onClick={() => window.location.href = '/diagnosticos'}>
              Crear Diagnóstico
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Tareas</h1>
            <p className="text-muted-foreground mt-1">
              {tasks.length} tareas totales
            </p>
          </div>
        </div>

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <KanbanSquare className="h-4 w-4" />
              Vista Kanban
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-2">
              <GanttChart className="h-4 w-4" />
              Vista Gantt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            <TaskKanban 
              tasks={tasks} 
              onTaskUpdate={fetchTasks}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>

          <TabsContent value="gantt" className="mt-6">
            <TaskGantt 
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>
        </Tabs>

        <TaskDetails
          task={selectedTask}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </MainLayout>
  );
}
