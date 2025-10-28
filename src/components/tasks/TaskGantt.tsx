import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types/task.types";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle } from "lucide-react";

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskGantt({ tasks, onTaskClick }: TaskGanttProps) {
  const tasksWithDates = tasks.filter(t => t.start_date && t.due_date);

  if (tasksWithDates.length === 0) {
    return (
      <Card variant="content" className="p-8 text-center">
        <p className="text-muted-foreground">
          No hay tareas con fechas asignadas para mostrar en la vista Gantt
        </p>
      </Card>
    );
  }

  // Calcular rango de fechas
  const allDates = tasksWithDates.flatMap(t => [
    new Date(t.start_date!),
    new Date(t.due_date!)
  ]);
  
  const minDate = startOfMonth(new Date(Math.min(...allDates.map(d => d.getTime()))));
  const maxDate = endOfMonth(new Date(Math.max(...allDates.map(d => d.getTime()))));
  const dateRange = eachDayOfInterval({ start: minDate, end: maxDate });
  const totalDays = dateRange.length;

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-color-success-default';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-color-success-default';
      case 'in_progress': return 'bg-blue-500';
      case 'blocked': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const calculateBarPosition = (task: Task) => {
    const startDate = new Date(task.start_date!);
    const endDate = new Date(task.due_date!);
    
    const startOffset = differenceInDays(startDate, minDate);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;
    
    return { leftPercent, widthPercent };
  };

  // Agrupar por mes para headers
  const monthHeaders: { label: string; days: number }[] = [];
  let currentMonth = '';
  let dayCount = 0;

  dateRange.forEach((date, index) => {
    const monthLabel = format(date, 'MMMM yyyy', { locale: es });
    
    if (monthLabel !== currentMonth) {
      if (dayCount > 0) {
        monthHeaders.push({ label: currentMonth, days: dayCount });
      }
      currentMonth = monthLabel;
      dayCount = 1;
    } else {
      dayCount++;
    }
    
    if (index === dateRange.length - 1) {
      monthHeaders.push({ label: currentMonth, days: dayCount });
    }
  });

  return (
    <Card variant="content" className="p-4 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header de meses */}
        <div className="flex border-b mb-4">
          <div className="w-64 shrink-0 p-2 font-semibold">Tarea</div>
          <div className="flex-1 flex">
            {monthHeaders.map((month, idx) => (
              <div
                key={idx}
                className="border-l p-2 text-center text-sm font-medium capitalize"
                style={{ width: `${(month.days / totalDays) * 100}%` }}
              >
                {month.label}
              </div>
            ))}
          </div>
        </div>

        {/* Tareas */}
        <div className="space-y-2">
          {tasksWithDates.map(task => {
            const { leftPercent, widthPercent } = calculateBarPosition(task);
            const dependsOn = tasksWithDates.find(t => t.id === task.depends_on);
            
            return (
              <div
                key={task.id}
                className="flex items-center hover:bg-muted/50 rounded transition-colors cursor-pointer"
                onClick={() => onTaskClick(task)}
              >
                <div className="w-64 shrink-0 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(task.start_date!), "d MMM", { locale: es })} - {format(new Date(task.due_date!), "d MMM", { locale: es })}
                        </span>
                        {task.priority && (
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {dependsOn && (
                      <div title={`Depende de: ${dependsOn.title}`}>
                        <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative h-8 p-1">
                  <div
                    className={`absolute h-6 rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                  >
                    <div className="h-full flex items-center justify-center text-xs text-white font-medium px-2">
                      {task.estimated_effort && `${task.estimated_effort}d`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-color-success-default"></div>
            <span>Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span>En Curso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted-foreground"></div>
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive"></div>
            <span>Bloqueada</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span>Con dependencias</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
