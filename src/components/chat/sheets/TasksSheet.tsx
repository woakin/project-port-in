import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function TasksSheet() {
  const { getUpcomingTasks, getOverdueTasks, updateTaskStatus, loading } = useTasks();
  const upcomingTasks = getUpcomingTasks();
  const overdueTasks = getOverdueTasks();

  const handleStatusChange = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({
        title: newStatus === 'completed' ? 'Tarea completada' : 'Tarea reactivada',
        description: 'El estado de la tarea se ha actualizado'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la tarea',
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'default';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {overdueTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-color-error-default" />
            <h3 className="font-semibold text-lg text-foreground">
              Vencidas ({overdueTasks.length})
            </h3>
          </div>
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <Card key={task.id} variant="content" className="p-4 border-l-4 border-l-color-error-default">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-foreground">{task.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange(task.id, task.status)}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusColor(task.status)}>
                    {task.status === 'completed' ? 'Completada' : 
                     task.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                  </Badge>
                  {task.priority && (
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority === 'high' ? 'Alta' :
                       task.priority === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  )}
                  {task.due_date && (
                    <span className="text-xs text-color-error-default flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Vencida: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg text-foreground">
            Próximas ({upcomingTasks.length})
          </h3>
        </div>
        
        {upcomingTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay tareas pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <Card key={task.id} variant="content" className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-foreground">{task.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange(task.id, task.status)}
                  >
                    <CheckCircle className={`h-4 w-4 ${
                      task.status === 'completed' ? 'text-success fill-success' : ''
                    }`} />
                  </Button>
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusColor(task.status)}>
                    {task.status === 'completed' ? 'Completada' : 
                     task.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                  </Badge>
                  {task.priority && (
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority === 'high' ? 'Alta' :
                       task.priority === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  )}
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
