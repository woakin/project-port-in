import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from "@/components/shared/Card";
import { KPI } from '@/types/kpi.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IndividualKPIChartProps {
  kpis: KPI[];
  kpiName: string;
}

export function IndividualKPIChart({ kpis, kpiName }: IndividualKPIChartProps) {
  const chartData = kpis.map(kpi => ({
    date: format(new Date(kpi.period_start), 'MMM yyyy', { locale: es }),
    value: Number(kpi.value),
    target: kpi.target_value ? Number(kpi.target_value) : undefined,
    fullDate: kpi.period_start
  }));

  if (chartData.length === 0) {
    return (
      <Card variant="content">
        <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
          No hay datos históricos para este KPI
        </div>
      </Card>
    );
  }

  const latestKPI = kpis[kpis.length - 1];
  const unit = latestKPI?.unit || '';

  return (
    <Card variant="content">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{kpiName}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">
            {latestKPI?.value.toLocaleString()}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          {latestKPI?.target_value && (
            <span className="text-sm text-muted-foreground">
              / {latestKPI.target_value.toLocaleString()} {unit}
            </span>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => [
              `${value.toLocaleString()} ${unit}`,
              ''
            ]}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={3}
            name="Valor"
            dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
            activeDot={{ r: 6 }}
          />
          {chartData.some(d => d.target !== undefined) && (
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Meta"
              dot={{ fill: 'hsl(var(--chart-3))', r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
