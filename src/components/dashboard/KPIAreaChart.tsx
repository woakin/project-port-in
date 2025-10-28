import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card } from "@/components/shared/Card";
import { KPI } from '@/types/kpi.types';

interface KPIAreaChartProps {
  kpis: KPI[];
  title: string;
}

const AREA_COLORS: Record<string, string> = {
  'Estrategia': 'hsl(var(--chart-1))',
  'Operaciones': 'hsl(var(--chart-2))',
  'Finanzas': 'hsl(var(--chart-3))',
  'Marketing': 'hsl(var(--chart-4))',
  'Legal': 'hsl(var(--chart-5))',
  'Tecnología': 'hsl(var(--chart-1))',
};

export function KPIAreaChart({ kpis, title }: KPIAreaChartProps) {
  // Agrupar KPIs por área y calcular promedio
  const areaData = kpis.reduce((acc, kpi) => {
    const existing = acc.find(item => item.area === kpi.area);
    if (existing) {
      existing.totalValue += Number(kpi.value);
      existing.count += 1;
    } else {
      acc.push({
        area: kpi.area,
        totalValue: Number(kpi.value),
        count: 1,
      });
    }
    return acc;
  }, [] as Array<{ area: string; totalValue: number; count: number }>);

  const chartData = areaData.map(item => ({
    area: item.area,
    promedio: Math.round(item.totalValue / item.count),
  })).sort((a, b) => b.promedio - a.promedio);

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
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="area" 
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
          <Bar dataKey="promedio" name="Promedio de KPIs" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={AREA_COLORS[entry.area] || 'hsl(var(--primary))'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
