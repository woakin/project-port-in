import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task.types";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TasksListProps {
  tasks: Task[];
  onUpdateStatus?: (taskId: string, status: Task['status']) => void;
}

export function TasksList({ tasks, onUpdateStatus }: TasksListProps) {
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'error' as const;
      case 'medium':
        return 'warning' as const;
      case 'low':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'success' as const;
      case 'in_progress':
        return 'default' as const;
      case 'blocked':
        return 'error' as const;
      default:
        return 'default' as const;
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (tasks.length === 0) {
    return (
      <Card variant="content" className="p-6">
        <p className="text-muted-foreground text-center">No hay tareas pendientes</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id} variant="content" className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                </Badge>
                <Badge variant={getStatusColor(task.status)}>
                  {task.status === 'completed' ? 'Completada' : 
                   task.status === 'in_progress' ? 'En progreso' :
                   task.status === 'blocked' ? 'Bloqueada' : 'Pendiente'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {task.due_date && (
                  <div className={`flex items-center gap-1 ${isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive' : ''}`}>
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(task.due_date), "d 'de' MMM", { locale: es })}</span>
                  </div>
                )}
                {task.estimated_effort && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{task.estimated_effort}h</span>
                  </div>
                )}
              </div>

              {task.status !== 'completed' && onUpdateStatus && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdateStatus(task.id, 'completed')}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Completar
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
