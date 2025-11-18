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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { KPI } from "@/types/kpi.types";

interface AddKPIValueModalProps {
  kpi: KPI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddKPIValueModal({ kpi, open, onOpenChange, onSuccess }: AddKPIValueModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    value: "",
    period_start: new Date(),
    period_end: new Date(),
  });

  // Reset form with default dates when modal opens
  useEffect(() => {
    if (open) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setForm({
        value: "",
        period_start: startOfMonth,
        period_end: endOfMonth,
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!kpi) return;

    if (!form.value) {
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
          value: parseFloat(form.value),
          area: kpi.area,
          unit: kpi.unit,
          target_value: kpi.target_value,
          period_start: format(form.period_start, "yyyy-MM-dd"),
          period_end: format(form.period_end, "yyyy-MM-dd"),
          source: "manual",
        });

      if (error) throw error;

      toast({
        title: "📈 Valor registrado",
        description: `Nuevo valor de ${form.value}${kpi.unit || ""} agregado a "${kpi.name}"`,
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
              placeholder="Ej: 85"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio del Periodo *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.period_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.period_start ? format(form.period_start, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.period_start}
                    onSelect={(date) => date && setForm({ ...form, period_start: date })}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fin del Periodo *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.period_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.period_end ? format(form.period_end, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.period_end}
                    onSelect={(date) => date && setForm({ ...form, period_end: date })}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Este registro se agregará como un nuevo punto en el historial del KPI
          </p>
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
