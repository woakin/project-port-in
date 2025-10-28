import { useState } from "react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types/task.types";
import { Calendar, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskKanbanProps {
  tasks: Task[];
  onTaskUpdate: () => void;
  onTaskClick: (task: Task) => void;
}

const statusColumns = [
  { id: 'pending', label: 'Pendiente', color: 'bg-muted' },
  { id: 'in_progress', label: 'En Curso', color: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'completed', label: 'Completada', color: 'bg-green-100 dark:bg-green-900' },
  { id: 'blocked', label: 'Bloqueada', color: 'bg-red-100 dark:bg-red-900' }
] as const;

export function TaskKanban({ tasks, onTaskUpdate, onTaskClick }: TaskKanbanProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', draggedTask.id);

      if (error) throw error;

      toast.success('Estado actualizado');
      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Error al actualizar estado');
    } finally {
      setDraggedTask(null);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statusColumns.map(column => {
        const columnTasks = getTasksByStatus(column.id);
        
        return (
          <div
            key={column.id}
            className="flex flex-col gap-3"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div className={`p-3 rounded-lg ${column.color}`}>
              <h3 className="font-semibold text-sm flex items-center justify-between">
                {column.label}
                <span className="text-xs bg-background/50 px-2 py-1 rounded">
                  {columnTasks.length}
                </span>
              </h3>
            </div>

            <div className="flex flex-col gap-2 min-h-[200px]">
              {columnTasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 cursor-move hover:shadow-md transition-shadow bg-card rounded-lg border"
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-2">
                        {task.title}
                      </h4>
                      {task.priority && (
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs shrink-0">
                          {task.priority}
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(task.due_date), "d MMM", { locale: es })}</span>
                        </div>
                      )}
                      {task.estimated_effort && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.estimated_effort}d</span>
                        </div>
                      )}
                      {task.depends_on && (
                        <AlertCircle className="h-3 w-3 text-warning" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
