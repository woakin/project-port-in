import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Cog, 
  DollarSign, 
  TrendingUp, 
  Scale, 
  Laptop,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagnosisData {
  id: string;
  maturity_level: string | null;
  strategy_score: number | null;
  operations_score: number | null;
  finance_score: number | null;
  marketing_score: number | null;
  legal_score: number | null;
  technology_score: number | null;
  insights?: {
    insights?: string[];
    critical_areas?: string[];
  };
  created_at: string;
}

interface CompanyStatusSummaryProps {
  diagnosis: DiagnosisData;
  companyName?: string;
}

const AREA_CONFIG = [
  { key: 'strategy_score', name: 'Estrategia', icon: Target, color: 'text-blue-500' },
  { key: 'operations_score', name: 'Operaciones', icon: Cog, color: 'text-orange-500' },
  { key: 'finance_score', name: 'Finanzas', icon: DollarSign, color: 'text-green-500' },
  { key: 'marketing_score', name: 'Marketing', icon: TrendingUp, color: 'text-purple-500' },
  { key: 'legal_score', name: 'Legal', icon: Scale, color: 'text-yellow-500' },
  { key: 'technology_score', name: 'Tecnología', icon: Laptop, color: 'text-cyan-500' }
] as const;

const AREA_NAMES: Record<string, string> = {
  strategy: 'Estrategia',
  operations: 'Operaciones',
  finance: 'Finanzas',
  marketing: 'Marketing',
  legal: 'Legal',
  technology: 'Tecnología'
};

export function CompanyStatusSummary({ diagnosis, companyName }: CompanyStatusSummaryProps) {
  const scores = AREA_CONFIG.map(area => ({
    ...area,
    score: diagnosis[area.key as keyof DiagnosisData] as number | null
  })).filter(a => a.score !== null);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, a) => sum + (a.score || 0), 0) / scores.length)
    : 0;

  const getHealthStatus = (score: number) => {
    if (score >= 70) return { label: 'Saludable', color: 'text-green-500', bgColor: 'bg-green-500/10', icon: CheckCircle };
    if (score >= 50) return { label: 'En Desarrollo', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: TrendingUp };
    return { label: 'Requiere Atención', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: AlertTriangle };
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const status = getHealthStatus(avgScore);
  const StatusIcon = status.icon;

  const criticalAreas = diagnosis.insights?.critical_areas || [];
  const insights = diagnosis.insights?.insights || [];

  // Sort scores to show weakest first
  const sortedScores = [...scores].sort((a, b) => (a.score || 0) - (b.score || 0));
  const weakestAreas = sortedScores.slice(0, 3).filter(a => (a.score || 0) < 60);

  return (
    <Card variant="content" className="space-y-6">
      {/* Header with overall health */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Resumen de Estatus
            {companyName && <span className="font-normal text-muted-foreground"> - {companyName}</span>}
          </h3>
          <p className="text-sm text-muted-foreground">
            Diagnóstico del {new Date(diagnosis.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full', status.bgColor)}>
          <StatusIcon className={cn('h-4 w-4', status.color)} />
          <span className={cn('text-sm font-medium', status.color)}>{status.label}</span>
        </div>
      </div>

      {/* Score Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Puntuación General</span>
          <span className="text-2xl font-bold text-foreground">{avgScore}/100</span>
        </div>
        <Progress value={avgScore} className="h-3" />
      </div>

      {/* Area Scores Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AREA_CONFIG.map(area => {
          const score = diagnosis[area.key as keyof DiagnosisData] as number | null;
          const Icon = area.icon;
          const isCritical = criticalAreas.includes(area.key.replace('_score', ''));
          
          return (
            <div
              key={area.key}
              className={cn(
                'p-3 rounded-lg border',
                isCritical ? 'border-red-500/50 bg-red-500/5' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('h-4 w-4', area.color)} />
                <span className="text-sm font-medium text-foreground">{area.name}</span>
                {isCritical && <AlertTriangle className="h-3 w-3 text-red-500" />}
              </div>
              <div className="flex items-center gap-2">
                <div className={cn('h-2 flex-1 rounded-full bg-muted overflow-hidden')}>
                  <div
                    className={cn('h-full transition-all', getScoreColor(score))}
                    style={{ width: `${score || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground w-10 text-right">
                  {score ?? '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Critical Areas */}
      {criticalAreas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <AlertTriangle className="h-4 w-4" />
            Áreas Críticas
          </div>
          <div className="flex flex-wrap gap-2">
            {criticalAreas.map(area => (
              <Badge key={area} variant="destructive" className="text-xs">
                {AREA_NAMES[area] || area}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Insights Principales
          </div>
          <ul className="space-y-2">
            {insights.slice(0, 5).map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weakest Areas Recommendations */}
      {weakestAreas.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            Prioridades de Mejora
          </div>
          <div className="space-y-2">
            {weakestAreas.map(area => (
              <div key={area.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{area.name}</span>
                <span className={cn(
                  'font-semibold',
                  (area.score || 0) < 40 ? 'text-red-500' : 'text-orange-500'
                )}>
                  {area.score}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
