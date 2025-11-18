import { KPISparklineCard } from "./KPISparklineCard";
import { KPI } from '@/types/kpi.types';
import { Button } from "@/components/ui/button";
import { TrendingUp, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KPIGridViewProps {
  kpiNames: string[];
  getKPIHistory: (name: string) => KPI[];
  getKPITrend: (name: string) => 'up' | 'down' | 'stable';
  onKPIClick: (name: string) => void;
}

export function KPIGridView({ kpiNames, getKPIHistory, getKPITrend, onKPIClick }: KPIGridViewProps) {
  const navigate = useNavigate();
  
  if (kpiNames.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-foreground">No hay KPIs registrados</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Comienza agregando KPIs manualmente o realiza un diagnóstico empresarial para obtener recomendaciones personalizadas
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => navigate('/diagnosticos')} className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Iniciar Diagnóstico
          </Button>
        </div>
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
