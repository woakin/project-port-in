import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { KPI } from "@/types/kpi.types";

interface KPIConfigModalProps {
  kpi: KPI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function KPIConfigModal({ kpi, open, onOpenChange, onSuccess }: KPIConfigModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    area: kpi?.area || "operations",
    target_value: kpi?.target_value?.toString() || "",
    unit: kpi?.unit || "",
  });

  // Update form when kpi changes
  useEffect(() => {
    if (kpi) {
      setForm({
        area: kpi.area,
        target_value: kpi.target_value?.toString() || "",
        unit: kpi.unit || "",
      });
    }
  }, [kpi]);

  const handleSave = async () => {
    if (!kpi) return;

    setIsSaving(true);
    try {
      // Update all records with this KPI name to maintain consistency
      const { error } = await supabase
        .from("kpis")
        .update({
          area: form.area,
          target_value: form.target_value ? parseFloat(form.target_value) : null,
          unit: form.unit || null,
        })
        .eq("company_id", kpi.company_id)
        .ilike("name", kpi.name);

      if (error) throw error;

      toast({
        title: "✅ Configuración actualizada",
        description: `Se actualizó la configuración de "${kpi.name}" en todos los registros históricos`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating KPI config:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración del KPI",
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
          <DialogTitle>Editar Configuración del KPI</DialogTitle>
          <DialogDescription>
            Actualiza los metadatos que se aplicarán a todos los registros históricos de "{kpi?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nombre del KPI</Label>
            <Input value={kpi?.name || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              El nombre no se puede cambiar para mantener la integridad del historial
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Área *</Label>
            <Select value={form.area} onValueChange={(value) => setForm({ ...form, area: value })}>
              <SelectTrigger id="area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estrategia">Estrategia</SelectItem>
                <SelectItem value="finanzas">Finanzas</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="operaciones">Operaciones</SelectItem>
                <SelectItem value="tecnología">Tecnología</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_value">Meta (Opcional)</Label>
            <Input
              id="target_value"
              type="number"
              step="any"
              placeholder="Ej: 100"
              value={form.target_value}
              onChange={(e) => setForm({ ...form, target_value: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidad (Opcional)</Label>
            <Input
              id="unit"
              placeholder="Ej: %, $, unidades"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
