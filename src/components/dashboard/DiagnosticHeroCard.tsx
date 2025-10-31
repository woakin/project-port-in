import { useNavigate } from "react-router-dom";
import { Diagnosis } from "@/types/diagnosis.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/shared/Badge";
import { Card } from "@/components/shared/Card";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Settings, 
  DollarSign, 
  Megaphone, 
  Scale,
  Code,
  AlertCircle,
  ArrowRight,
  Trophy
} from "lucide-react";
import { 
  calculateAverageScore, 
  getDiagnosticStatus, 
  needsUpdate, 
  getDaysSinceUpdate,
  getCriticalArea,
  getStrongestArea
} from "@/lib/diagnosticUtils";
import { cn } from "@/lib/utils";

interface DiagnosticHeroCardProps {
  diagnosis: Diagnosis;
}

const areaIcons = {
  Estrategia: TrendingUp,
  Operaciones: Settings,
  Finanzas: DollarSign,
  Marketing: Megaphone,
  Legal: Scale,
  Tecnología: Code
};

export function DiagnosticHeroCard({ diagnosis }: DiagnosticHeroCardProps) {
  const navigate = useNavigate();
  const averageScore = calculateAverageScore(diagnosis);
  const status = getDiagnosticStatus(averageScore);
  const requiresUpdate = needsUpdate(diagnosis);
  const daysSinceUpdate = getDaysSinceUpdate(diagnosis);
  const criticalArea = getCriticalArea(diagnosis);
  const strongestArea = getStrongestArea(diagnosis);

  const areas = [
    { name: 'Estrategia', score: diagnosis.strategy_score, icon: TrendingUp },
    { name: 'Operaciones', score: diagnosis.operations_score, icon: Settings },
    { name: 'Finanzas', score: diagnosis.finance_score, icon: DollarSign },
    { name: 'Marketing', score: diagnosis.marketing_score, icon: Megaphone },
    { name: 'Legal', score: diagnosis.legal_score, icon: Scale },
    { name: 'Tecnología', score: diagnosis.technology_score, icon: Code }
  ];

  const maturityLabels = {
    idea: 'Idea',
    startup: 'Startup',
    pyme: 'PYME',
    corporate: 'Corporativo'
  };

  return (
    <Card 
      variant="content" 
      className={cn(
        "border-2 transition-all duration-300",
        status.bgColor,
        status.borderColor
      )}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Section - Traffic Light */}
        <div className="flex flex-col items-center justify-center lg:w-1/4 py-6 lg:py-8 lg:border-r border-border">
          <div className={cn(
            "w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 mb-4",
            status.borderColor,
            status.bgColor
          )}>
            <div className={cn("text-5xl font-bold", status.textColor)}>
              {averageScore}%
            </div>
          </div>
          <Badge 
            variant={status.level === 'healthy' ? 'success' : status.level === 'warning' ? 'warning' : 'error'}
            className="mb-2"
          >
            {status.level === 'healthy' ? '🟢 Saludable' : status.level === 'warning' ? '🟡 Atención' : '🔴 Crítico'}
          </Badge>
          <Badge variant="default" className="capitalize">
            {maturityLabels[diagnosis.maturity_level]}
          </Badge>
        </div>

        {/* Center Section - Scores by Area */}
        <div className="flex-1 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">📊 Diagnóstico de tu Negocio</h3>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">v{diagnosis.version}</Badge>
              {requiresUpdate && (
                <Badge variant="warning" className="text-xs animate-pulse">
                  Actualización recomendada
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {areas.map((area) => {
              const Icon = area.icon;
              const isLowest = area.score === criticalArea.score;
              const isHighest = area.score === strongestArea.score;
              
              return (
                <div 
                  key={area.name}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isLowest && "border-destructive bg-destructive/5",
                    isHighest && "border-green-500 bg-green-500/5"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">{area.name}</p>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-2xl font-bold text-foreground">{area.score}%</p>
                    {isLowest && <AlertCircle className="h-4 w-4 text-destructive" />}
                    {isHighest && <Trophy className="h-4 w-4 text-green-500" />}
                  </div>
                  <Progress value={area.score} className="h-1.5" />
                </div>
              );
            })}
          </div>

          <div className={cn(
            "p-4 rounded-lg border",
            status.bgColor,
            status.borderColor
          )}>
            <p className={cn("text-sm font-medium mb-1", status.textColor)}>
              {status.message}
            </p>
            <p className="text-xs text-muted-foreground">
              💡 Enfócate primero en <span className="font-semibold text-foreground">{criticalArea.name}</span> ({criticalArea.score}%). 
              Tu área más fuerte es <span className="font-semibold text-foreground">{strongestArea.name}</span> ({strongestArea.score}%).
            </p>
          </div>
        </div>

        {/* Right Section - Actions & Status */}
        <div className="lg:w-1/4 py-4 lg:pl-6 lg:border-l border-border flex flex-col justify-between">
          <div className="space-y-3 mb-4">
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Última actualización</p>
              <p className="font-semibold text-foreground">
                Hace {daysSinceUpdate} {daysSinceUpdate === 1 ? 'día' : 'días'}
              </p>
            </div>

            {diagnosis.insights?.insights && diagnosis.insights.insights.length > 0 && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Insights generados</p>
                <p className="font-semibold text-foreground">
                  {diagnosis.insights.insights.length} recomendaciones
                </p>
              </div>
            )}

            {diagnosis.insights?.critical_areas && diagnosis.insights.critical_areas.length > 0 && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Áreas críticas</p>
                <p className="font-semibold text-foreground">
                  {diagnosis.insights.critical_areas.length} identificadas
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => navigate(`/diagnosis/${diagnosis.id}`)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Ver Completo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              onClick={() => navigate('/chat-diagnosis')}
              variant={requiresUpdate ? "default" : "gradient"}
              size="lg"
              className={cn(
                "w-full",
                requiresUpdate && "animate-pulse"
              )}
            >
              {requiresUpdate ? 'Actualizar Ahora' : 'Actualizar Diagnóstico'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
