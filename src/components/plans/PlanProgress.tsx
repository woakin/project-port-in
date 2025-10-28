import { Card } from "@/components/shared/Card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlanProgress as PlanProgressType } from "@/hooks/usePlanProgress";
import { CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";

interface PlanProgressProps {
  progress: PlanProgressType;
}

export function PlanProgress({ progress }: PlanProgressProps) {
  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card variant="content">
        <h3 className="text-lg font-semibold mb-4">Progreso General</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progreso Total</span>
              <span className="text-sm font-bold">{progress.overall_progress}%</span>
            </div>
            <Progress value={progress.overall_progress} className="h-3" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Completadas</p>
                <p className="text-sm font-semibold">{progress.completed_tasks}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">En curso</p>
                <p className="text-sm font-semibold">{progress.in_progress_tasks}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <Circle className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-sm font-semibold">{progress.pending_tasks}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Bloqueadas</p>
                <p className="text-sm font-semibold">{progress.blocked_tasks}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Progress by Area */}
      {progress.by_area && progress.by_area.length > 0 && (
        <Card variant="content">
          <h3 className="text-lg font-semibold mb-4">Progreso por Área</h3>
          
          <div className="space-y-4">
            {progress.by_area.map((area) => (
              <div key={area.area_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{area.area_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {area.completed}/{area.total}
                    </span>
                    <Badge variant="default" className="text-xs">
                      {area.progress}%
                    </Badge>
                  </div>
                </div>
                <Progress value={area.progress} className="h-2" />
                
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {area.in_progress > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {area.in_progress} en curso
                    </span>
                  )}
                  {area.pending > 0 && (
                    <span className="flex items-center gap-1">
                      <Circle className="h-3 w-3" />
                      {area.pending} pendientes
                    </span>
                  )}
                  {area.blocked > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {area.blocked} bloqueadas
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
