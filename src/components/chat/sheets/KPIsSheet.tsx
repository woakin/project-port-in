import { useKPIs } from '@/hooks/useKPIs';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { TrendingUp, TrendingDown, Target, Loader2 } from 'lucide-react';

export default function KPIsSheet() {
  const { getLatestKPIs, loading } = useKPIs();
  const kpis = getLatestKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay KPIs registrados</p>
      </div>
    );
  }

  // Agrupar por área
  const kpisByArea = kpis.reduce((acc, kpi) => {
    if (!acc[kpi.area]) acc[kpi.area] = [];
    acc[kpi.area].push(kpi);
    return acc;
  }, {} as Record<string, typeof kpis>);

  return (
    <div className="space-y-6 py-4">
      {Object.entries(kpisByArea).map(([area, areaKpis]) => (
        <div key={area}>
          <h3 className="font-semibold text-lg mb-3 text-foreground capitalize">
            {area}
          </h3>
          <div className="space-y-3">
            {areaKpis.map((kpi) => {
              const isOnTarget = kpi.target_value ? kpi.value >= kpi.target_value : null;
              const progress = kpi.target_value 
                ? Math.round((kpi.value / kpi.target_value) * 100) 
                : null;

              return (
                <Card key={kpi.id} variant="content" className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-foreground">{kpi.name}</h4>
                    {isOnTarget !== null && (
                      <Badge variant={isOnTarget ? 'success' : 'warning'}>
                        {isOnTarget ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-foreground">
                      {kpi.value.toLocaleString()}
                    </span>
                    {kpi.unit && (
                      <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                    )}
                  </div>

                  {kpi.target_value && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Meta: {kpi.target_value.toLocaleString()} {kpi.unit}</span>
                        {progress !== null && <span>{progress}%</span>}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            isOnTarget ? 'bg-success' : 'bg-warning'
                          }`}
                          style={{ width: `${Math.min(progress || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-2">
                    Fuente: {kpi.source} · {new Date(kpi.created_at).toLocaleDateString()}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
