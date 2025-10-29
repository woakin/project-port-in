import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useKPIs } from "@/hooks/useKPIs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Edit2, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KPI } from "@/types/kpi.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function KPIs() {
  const { kpis, loading, refetch } = useKPIs();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    value: "",
    target_value: "",
    unit: "",
  });

  const filteredKPIs = kpis.filter((kpi) =>
    kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kpi.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (kpi: KPI) => {
    setEditingKPI(kpi);
    setEditForm({
      name: kpi.name,
      value: kpi.value.toString(),
      target_value: kpi.target_value?.toString() || "",
      unit: kpi.unit || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingKPI) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("kpis")
        .update({
          name: editForm.name,
          value: parseFloat(editForm.value),
          target_value: editForm.target_value ? parseFloat(editForm.target_value) : null,
          unit: editForm.unit || null,
        })
        .eq("id", editingKPI.id);

      if (error) throw error;

      toast({
        title: "KPI actualizado",
        description: "El KPI se ha actualizado correctamente",
      });

      setIsEditDialogOpen(false);
      setEditingKPI(null);
      refetch();
    } catch (error) {
      console.error("Error updating KPI:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el KPI",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getProgress = (kpi: KPI): number => {
    if (!kpi.target_value) return 0;
    return Math.min(Math.round((kpi.value / kpi.target_value) * 100), 100);
  };

  const isOnTarget = (kpi: KPI): boolean | null => {
    if (!kpi.target_value) return null;
    return kpi.value >= kpi.target_value;
  };

  const areaColors: Record<string, string> = {
    strategy: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    finance: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    marketing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    operations: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    technology: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    legal: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-comfortable">
        <div className="mb-comfortable">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">KPIs</h1>
              <p className="text-base text-muted-foreground">
                Gestiona y monitorea todos tus indicadores clave de rendimiento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card variant="content" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total KPIs</p>
                  <p className="text-2xl font-bold text-foreground">{kpis.length}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card variant="content" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Meta</p>
                  <p className="text-2xl font-bold text-color-success-default">
                    {kpis.filter((k) => isOnTarget(k) === true).length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-color-success-default" />
              </div>
            </Card>
            <Card variant="content" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bajo Meta</p>
                  <p className="text-2xl font-bold text-color-error-default">
                    {kpis.filter((k) => isOnTarget(k) === false).length}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-color-error-default" />
              </div>
            </Card>
          </div>
        </div>

        <Card variant="service">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando KPIs...
            </div>
          ) : filteredKPIs.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron KPIs" : "No hay KPIs registrados"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Valor Actual</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKPIs.map((kpi) => {
                    const progress = getProgress(kpi);
                    const onTarget = isOnTarget(kpi);

                    return (
                      <TableRow key={kpi.id}>
                        <TableCell className="font-medium">{kpi.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="default"
                            className={areaColors[kpi.area] || ""}
                          >
                            {kpi.area}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {kpi.value.toLocaleString()}
                          </span>
                          {kpi.unit && (
                            <span className="text-muted-foreground ml-1">
                              {kpi.unit}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {kpi.target_value ? (
                            <>
                              <span className="font-semibold">
                                {kpi.target_value.toLocaleString()}
                              </span>
                              {kpi.unit && (
                                <span className="text-muted-foreground ml-1">
                                  {kpi.unit}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {kpi.target_value ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    onTarget
                                      ? "bg-color-success-default"
                                      : "bg-color-warning-default"
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {progress}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="text-muted-foreground">
                            {format(new Date(kpi.period_start), "dd MMM", {
                              locale: es,
                            })}{" "}
                            -{" "}
                            {format(new Date(kpi.period_end), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{kpi.source}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(kpi)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar KPI</DialogTitle>
            <DialogDescription>
              Actualiza los valores del indicador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor Actual</Label>
              <Input
                id="value"
                type="number"
                value={editForm.value}
                onChange={(e) =>
                  setEditForm({ ...editForm, value: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Meta</Label>
              <Input
                id="target"
                type="number"
                value={editForm.target_value}
                onChange={(e) =>
                  setEditForm({ ...editForm, target_value: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Input
                id="unit"
                value={editForm.unit}
                onChange={(e) =>
                  setEditForm({ ...editForm, unit: e.target.value })
                }
                placeholder="Ej: %, $, usuarios, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
