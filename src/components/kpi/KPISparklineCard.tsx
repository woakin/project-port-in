import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KPI } from '@/types/kpi.types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPISparklineCardProps {
  kpiName: string;
  history: KPI[];
  trend: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

export function KPISparklineCard({ kpiName, history, trend, onClick }: KPISparklineCardProps) {
  if (history.length === 0) return null;

  const latest = history[history.length - 1];
  const sparklineData = history.map(kpi => ({
    value: Number(kpi.value)
  }));

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-color-success-default';
    if (trend === 'down') return 'text-color-error-default';
    return 'text-muted-foreground';
  };

  const isOnTarget = latest.target_value ? latest.value >= latest.target_value : null;

  return (
    <div onClick={onClick} className="cursor-pointer">
      <Card 
        variant="content" 
        className="p-4 hover:shadow-md transition-shadow"
      >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground line-clamp-1">
              {kpiName}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {latest.area}
            </p>
          </div>
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {latest.value.toLocaleString()}
          </span>
          {latest.unit && (
            <span className="text-xs text-muted-foreground">{latest.unit}</span>
          )}
        </div>

        {latest.target_value && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Meta: {latest.target_value.toLocaleString()} {latest.unit}
            </span>
            {isOnTarget !== null && (
              <Badge variant={isOnTarget ? "success" : "warning"} className="text-xs">
                {isOnTarget ? "En meta" : "Por debajo"}
              </Badge>
            )}
          </div>
        )}

        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={trend === 'up' ? 'hsl(var(--color-success-default))' : trend === 'down' ? 'hsl(var(--color-error-default))' : 'hsl(var(--muted-foreground))'} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
    </div>
  );
}
