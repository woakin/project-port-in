import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/ui/button";
import { KPI } from '@/types/kpi.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IndividualKPIChartProps {
  kpis: KPI[];
  kpiName: string;
  onKPIUpdated?: () => void;
}

export function IndividualKPIChart({ kpis, kpiName, onKPIUpdated }: IndividualKPIChartProps) {
  const { toast } = useToast();
  const [deletingValue, setDeletingValue] = useState<KPI | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const chartData = kpis.map(kpi => ({
    date: format(new Date(kpi.period_start), 'MMM yyyy', { locale: es }),
    value: Number(kpi.value),
    target: kpi.target_value ? Number(kpi.target_value) : undefined,
    fullDate: kpi.period_start
  }));

  const handleDeleteValue = async () => {
    if (!deletingValue) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("kpis")
        .delete()
        .eq("id", deletingValue.id);

      if (error) throw error;

      toast({
        title: "Valor eliminado",
        description: `Valor del ${format(new Date(deletingValue.period_start), 'dd/MM/yyyy', { locale: es })} eliminado`,
      });

      setDeletingValue(null);
      onKPIUpdated?.();
    } catch (error) {
      console.error("Error deleting KPI value:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el valor",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
    <>
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

        {/* Historical Values Table */}
        <div className="mt-8 border-t pt-6">
          <h4 className="text-sm font-semibold mb-4 text-foreground">
            Historial de Valores
          </h4>
          <div className="space-y-2">
            {kpis.map((kpi) => (
              <div 
                key={kpi.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-sm text-muted-foreground min-w-[100px]">
                    {format(new Date(kpi.period_start), 'dd/MM/yyyy', { locale: es })}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {kpi.value.toLocaleString()} {kpi.unit}
                  </div>
                  {kpi.target_value && (
                    <div className="text-xs text-muted-foreground">
                      Meta: {kpi.target_value.toLocaleString()} {kpi.unit}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground ml-auto">
                    {kpi.source}
                  </div>
                </div>
                <TooltipProvider>
                  <TooltipPrimitive>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={kpis.length === 1}
                          onClick={() => setDeletingValue(kpi)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {kpis.length === 1 && (
                      <TooltipContent>
                        No puedes eliminar el único valor. Borra el KPI completo desde la vista principal.
                      </TooltipContent>
                    )}
                  </TooltipPrimitive>
                </TooltipProvider>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingValue} onOpenChange={(open) => !open && setDeletingValue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este valor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el valor de {deletingValue?.value.toLocaleString()} del{' '}
              {deletingValue && format(new Date(deletingValue.period_start), 'dd/MM/yyyy', { locale: es })}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteValue}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar valor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
