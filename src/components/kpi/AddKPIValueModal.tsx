import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { KPI } from "@/types/kpi.types";

interface AddKPIValueModalProps {
  kpi: KPI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type PeriodType = "day" | "week" | "month";

export function AddKPIValueModal({ kpi, open, onOpenChange, onSuccess }: AddKPIValueModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [value, setValue] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDate(new Date());
      setPeriodType("month");
      setValue("");
    }
  }, [open]);

  // Calculate period dates based on selected date and period type
  const getPeriodDates = (date: Date, type: PeriodType) => {
    switch (type) {
      case "day":
        return { start: startOfDay(date), end: endOfDay(date) };
      case "week":
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(date), end: endOfMonth(date) };
    }
  };

  const { start: period_start, end: period_end } = getPeriodDates(selectedDate, periodType);

  const handleSave = async () => {
    if (!kpi) return;

    if (!value) {
      toast({
        title: "Error de validación",
        description: "El valor es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Insert new historical record
      const { error } = await supabase
        .from("kpis")
        .insert({
          company_id: kpi.company_id,
          name: kpi.name,
          value: parseFloat(value),
          area: kpi.area,
          unit: kpi.unit,
          target_value: kpi.target_value,
          period_start: format(period_start, "yyyy-MM-dd"),
          period_end: format(period_end, "yyyy-MM-dd"),
          source: "manual",
        });

      if (error) throw error;

      toast({
        title: "📈 Valor registrado",
        description: `Nuevo valor de ${value}${kpi.unit || ""} agregado a "${kpi.name}"`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding KPI value:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el nuevo valor",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Valor</DialogTitle>
          <DialogDescription>
            Agrega un nuevo punto histórico para "{kpi?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">KPI</p>
              <p className="font-medium text-sm">{kpi?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Área</p>
              <p className="font-medium text-sm capitalize">{kpi?.area}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Unidad</p>
              <p className="font-medium text-sm">{kpi?.unit || "-"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Nuevo Valor *</Label>
            <Input
              id="value"
              type="number"
              step="any"
              placeholder="Ej: 150"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Período *</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={periodType === "day" ? "default" : "outline"}
                onClick={() => setPeriodType("day")}
              >
                Día
              </Button>
              <Button
                type="button"
                variant={periodType === "week" ? "default" : "outline"}
                onClick={() => setPeriodType("week")}
              >
                Semana
              </Button>
              <Button
                type="button"
                variant={periodType === "month" ? "default" : "outline"}
                onClick={() => setPeriodType("month")}
              >
                Mes
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Referencia *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="rounded-lg bg-muted/30 p-3 border border-border/50 space-y-1">
            <p className="text-xs font-medium flex items-center gap-1">
              📅 Período calculado:
            </p>
            <p className="text-sm font-mono">
              {format(period_start, "dd/MM/yyyy", { locale: es })} - {format(period_end, "dd/MM/yyyy", { locale: es })}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              El período se calcula automáticamente según el tipo seleccionado
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Registrando..." : "Registrar Valor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
