import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from "@/components/shared/Card";
import { KPI } from '@/types/kpi.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KPITrendChartProps {
  kpis: KPI[];
  title: string;
  dataKey?: string;
}

export function KPITrendChart({ kpis, title, dataKey = "value" }: KPITrendChartProps) {
  // Agrupar KPIs por período y calcular promedio
  const chartData = kpis
    .sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime())
    .map(kpi => ({
      date: format(new Date(kpi.period_start), 'MMM yyyy', { locale: es }),
      value: Number(kpi.value),
      target: kpi.target_value ? Number(kpi.target_value) : undefined,
      name: kpi.name
    }));

  if (chartData.length === 0) {
    return (
      <Card variant="content">
        <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          No hay datos para mostrar
        </div>
      </Card>
    );
  }

  return (
    <Card variant="content">
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
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
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            name="Valor Actual"
            dot={{ fill: 'hsl(var(--chart-1))' }}
          />
          {chartData.some(d => d.target !== undefined) && (
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Meta"
              dot={{ fill: 'hsl(var(--chart-3))' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
