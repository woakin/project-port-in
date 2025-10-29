import { KPISparklineCard } from "./KPISparklineCard";
import { KPI } from '@/types/kpi.types';

interface KPIGridViewProps {
  kpiNames: string[];
  getKPIHistory: (name: string) => KPI[];
  getKPITrend: (name: string) => 'up' | 'down' | 'stable';
  onKPIClick: (name: string) => void;
}

export function KPIGridView({ kpiNames, getKPIHistory, getKPITrend, onKPIClick }: KPIGridViewProps) {
  if (kpiNames.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay KPIs registrados
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpiNames.map((name) => {
        const history = getKPIHistory(name);
        const trend = getKPITrend(name);
        
        return (
          <KPISparklineCard
            key={name}
            kpiName={name}
            history={history}
            trend={trend}
            onClick={() => onKPIClick(name)}
          />
        );
      })}
    </div>
  );
}
