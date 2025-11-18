import { Card } from "@/components/shared/Card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  unit?: string;
  target?: string;
  sparklineData?: Array<{ value: number }>;
  trend?: 'up' | 'down' | 'stable';
}

export function KPICard({ title, value, change, unit, target, sparklineData, trend }: KPICardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="h-4 w-4" />;
    if (change > 0) return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground';
    if (change > 0) return 'text-color-success-default';
    return 'text-color-error-default';
  };

  const getSparklineColor = () => {
    if (trend === 'up') return 'hsl(var(--color-success-default))';
    if (trend === 'down') return 'hsl(var(--color-error-default))';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <Card variant="content" className="p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          {target && (
            <span className="text-sm text-muted-foreground">
              / {target} {unit}
            </span>
          )}
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div className="h-10 -mx-2 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getSparklineColor()} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
