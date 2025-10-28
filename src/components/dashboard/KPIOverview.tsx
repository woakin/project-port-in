import { Card } from "@/components/shared/Card";
import { KPI } from "@/types/kpi.types";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface KPIOverviewProps {
  kpis: KPI[];
}

export function KPIOverview({ kpis }: KPIOverviewProps) {
  const getProgress = (kpi: KPI) => {
    if (!kpi.target_value) return 0;
    return Math.min((kpi.value / kpi.target_value) * 100, 100);
  };

  const isOnTarget = (kpi: KPI) => {
    if (!kpi.target_value) return null;
    return kpi.value >= kpi.target_value;
  };

  if (kpis.length === 0) {
    return (
      <Card variant="content" className="p-6">
        <p className="text-muted-foreground text-center">No hay KPIs registrados</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {kpis.map((kpi) => {
        const progress = getProgress(kpi);
        const onTarget = isOnTarget(kpi);

        return (
          <Card key={kpi.id} variant="content" className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">{kpi.name}</h4>
                    {onTarget !== null && (
                      onTarget ? (
                        <TrendingUp className="h-4 w-4 text-color-success-default" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-color-error-default" />
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.area}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">
                    {kpi.value.toLocaleString()}
                  </span>
                  {kpi.unit && (
                    <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                  )}
                  {kpi.target_value && (
                    <span className="text-sm text-muted-foreground">
                      / {kpi.target_value.toLocaleString()} {kpi.unit}
                    </span>
                  )}
                </div>

                {kpi.target_value && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {progress.toFixed(0)}% del objetivo
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Fuente: {kpi.source}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
