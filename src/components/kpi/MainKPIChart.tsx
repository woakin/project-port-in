import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { KPI } from '@/types/kpi.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MainKPIChartProps {
  kpi: KPI;
  history: KPI[];
  trend: 'up' | 'down' | 'stable';
}

export function MainKPIChart({ kpi, history, trend }: MainKPIChartProps) {
  const chartData = history.map(k => ({
    date: format(new Date(k.period_start), 'MMM yyyy', { locale: es }),
    value: Number(k.value),
    target: k.target_value ? Number(k.target_value) : undefined
  }));

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-5 w-5" />;
    if (trend === 'down') return <TrendingDown className="h-5 w-5" />;
    return <Minus className="h-5 w-5" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-color-success-default';
    if (trend === 'down') return 'text-color-error-default';
    return 'text-muted-foreground';
  };

  const isOnTarget = kpi.target_value ? kpi.value >= kpi.target_value : null;

  return (
    <Card variant="content" className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-secondary fill-secondary" />
              <h3 className="text-lg font-semibold text-foreground">KPI Principal</h3>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{kpi.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{kpi.area}</p>
          </div>
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
          </div>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-foreground">
            {kpi.value.toLocaleString()}
          </span>
          {kpi.unit && (
            <span className="text-lg text-muted-foreground">{kpi.unit}</span>
          )}
        </div>

        {kpi.target_value && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Meta</p>
              <p className="text-lg font-semibold text-foreground">
                {kpi.target_value.toLocaleString()} {kpi.unit}
              </p>
            </div>
            {isOnTarget !== null && (
              <Badge variant={isOnTarget ? "success" : "warning"} className="text-sm">
                {isOnTarget ? "✓ Cumpliendo" : "⚠ Por debajo"}
              </Badge>
            )}
          </div>
        )}

        {chartData.length > 1 && (
          <div className="pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Evolución</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                />
                {chartData.some(d => d.target !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
