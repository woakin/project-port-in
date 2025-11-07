import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useKPIs } from "@/hooks/useKPIs";
import { useAuth } from "@/hooks/useAuth";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TrendingUp, TrendingDown, Edit2, Search, Target, Trash2, Plus, Star, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KPI } from "@/types/kpi.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { KPISelector } from "@/components/kpi/KPISelector";
import { IndividualKPIChart } from "@/components/kpi/IndividualKPIChart";
import { KPIGridView } from "@/components/kpi/KPIGridView";
import { KPIAreaChart } from "@/components/dashboard/KPIAreaChart";
import { KPIAlerts } from "@/components/dashboard/KPIAlerts";
import { SuggestedKPIsModal } from "@/components/kpi/SuggestedKPIsModal";

export default function KPIs() {
  const { kpis, loading, refetch, getKPIHistory, getUniqueKPINames, getKPITrend, markAsMainKPI, getLatestKPIs } = useKPIs();
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateContext } = useAIAssistant();
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingKPI, setDeletingKPI] = useState<KPI | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedKPIName, setSelectedKPIName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    area: "",
    value: "",
    target_value: "",
    unit: "",
    period_start: "",
    period_end: "",
  });

  // Form state for creating
  const [createForm, setCreateForm] = useState({
    name: "",
    area: "operations",
    value: "",
    target_value: "",
    unit: "",
    period_start: "",
    period_end: "",
  });

  const uniqueKPINames = getUniqueKPINames();
  const latestKPIs = getLatestKPIs();

  useEffect(() => {
    const handleKPIsUpdated = () => {
      console.log('KPIs updated event received');
      refetch();
      toast({ title: 'KPIs actualizados', description: 'Datos actualizados exitosamente' });
    };

    window.addEventListener('kpis-updated', handleKPIsUpdated);
    return () => window.removeEventListener('kpis-updated', handleKPIsUpdated);
  }, [refetch, toast]);

  // Update AI Assistant context when selected KPI changes
  useEffect(() => {
    if (selectedKPIName) {
      const selectedKPI = latestKPIs.find(kpi => kpi.name === selectedKPIName);
      updateContext({
        focus: {
          kpiName: selectedKPIName,
          kpiId: selectedKPI?.id,
        },
        data: {
          kpis: latestKPIs.map(k => ({
            name: k.name,
            area: k.area,
            value: k.value,
            target_value: k.target_value,
            unit: k.unit,
          })),
          selectedKPI: selectedKPI ? {
            name: selectedKPI.name,
            value: selectedKPI.value,
            target_value: selectedKPI.target_value,
            unit: selectedKPI.unit,
          } : null
        }
      });
    } else {
      updateContext({
        focus: undefined,
        data: {
          kpis: latestKPIs.map(k => ({
            name: k.name,
            area: k.area,
            value: k.value,
            target_value: k.target_value,
            unit: k.unit,
          }))
        }
      });
    }
  }, [selectedKPIName, latestKPIs, updateContext]);

  const filteredKPIs = latestKPIs.filter((kpi) => {
    const matchesSearch = kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === "all" || kpi.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const handleEditClick = (kpi: KPI) => {
    setEditingKPI(kpi);
    setEditForm({
      name: kpi.name,
      area: kpi.area,
      value: kpi.value.toString(),
      target_value: kpi.target_value?.toString() || "",
      unit: kpi.unit || "",
      period_start: kpi.period_start.split('T')[0],
      period_end: kpi.period_end.split('T')[0],
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateClick = () => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setCreateForm({
      name: "",
      area: "operations",
      value: "",
      target_value: "",
      unit: "",
      period_start: today.toISOString().split('T')[0],
      period_end: endOfMonth.toISOString().split('T')[0],
    });
    setIsCreateDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingKPI) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("kpis")
        .update({
          name: editForm.name,
          area: editForm.area,
          value: parseFloat(editForm.value),
          target_value: editForm.target_value ? parseFloat(editForm.target_value) : null,
          unit: editForm.unit || null,
          period_start: editForm.period_start,
          period_end: editForm.period_end,
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

  const handleCreateKPI = async () => {
    if (!user) return;

    if (!createForm.name || !createForm.value) {
      toast({
        title: "Error de validación",
        description: "El nombre y valor son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("No se encontró la empresa del usuario");
      }

      const { error } = await supabase
        .from("kpis")
        .insert({
          name: createForm.name.trim(),
          area: createForm.area,
          value: parseFloat(createForm.value),
          target_value: createForm.target_value ? parseFloat(createForm.target_value) : null,
          unit: createForm.unit.trim() || null,
          company_id: profile.company_id,
          period_start: createForm.period_start,
          period_end: createForm.period_end,
          source: "manual",
        });

      if (error) throw error;

      toast({
        title: "KPI creado",
        description: "El KPI se ha creado correctamente",
      });

      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error creating KPI:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el KPI",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (kpi: KPI) => {
    setDeletingKPI(kpi);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingKPI) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("kpis")
        .delete()
        .eq("id", deletingKPI.id);

      if (error) throw error;

      toast({
        title: "KPI eliminado",
        description: "El KPI se ha eliminado correctamente",
      });

      setIsDeleteDialogOpen(false);
      setDeletingKPI(null);
      refetch();
    } catch (error) {
      console.error("Error deleting KPI:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el KPI",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsMain = async (kpi: KPI) => {
    try {
      await markAsMainKPI(kpi.id);
      toast({
        title: "KPI destacado",
        description: `${kpi.name} se ha marcado como KPI principal`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo marcar el KPI como principal",
        variant: "destructive",
      });
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
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsSuggestionsModalOpen(true)} 
                variant="outline" 
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Obtener KPIs recomendados
              </Button>
              <Button onClick={handleCreateClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear KPI
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="content" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total KPIs</p>
                  <p className="text-2xl font-bold text-foreground">{latestKPIs.length}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card variant="content" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Meta</p>
                  <p className="text-2xl font-bold text-color-success-default">
                    {latestKPIs.filter((k) => isOnTarget(k) === true).length}
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
                    {latestKPIs.filter((k) => isOnTarget(k) === false).length}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-color-error-default" />
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
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
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  <SelectItem value="strategy">Estrategia</SelectItem>
                  <SelectItem value="finance">Finanzas</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operaciones</SelectItem>
                  <SelectItem value="technology">Tecnología</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
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
                    {searchTerm || areaFilter !== "all" ? "No se encontraron KPIs" : "No hay KPIs registrados"}
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {kpi.is_main_kpi && (
                                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                                )}
                                <span className="font-medium">{kpi.name}</span>
                              </div>
                            </TableCell>
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
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsMain(kpi)}
                                  title={kpi.is_main_kpi ? "KPI principal" : "Marcar como principal"}
                                  className={kpi.is_main_kpi ? "text-secondary" : ""}
                                >
                                  <Star className={`h-4 w-4 ${kpi.is_main_kpi ? "fill-secondary" : ""}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(kpi)}
                                  title="Editar KPI"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(kpi)}
                                  title="Eliminar KPI"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {uniqueKPINames.length === 0 ? (
              <Card variant="content" className="p-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay datos suficientes para mostrar tendencias
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Evolución Individual</h2>
                  <KPISelector
                    kpiNames={uniqueKPINames}
                    selectedKPI={selectedKPIName}
                    onSelectKPI={setSelectedKPIName}
                  />
                  {selectedKPIName && (
                    <IndividualKPIChart
                      kpis={getKPIHistory(selectedKPIName)}
                      kpiName={selectedKPIName}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Comparación por Área</h2>
                  <KPIAreaChart kpis={latestKPIs} title="" />
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Todos los KPIs</h2>
                  <KPIGridView
                    kpiNames={uniqueKPINames}
                    getKPIHistory={getKPIHistory}
                    getKPITrend={getKPITrend}
                    onKPIClick={(name) => {
                      setSelectedKPIName(name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <KPIAlerts />
          </TabsContent>
        </Tabs>
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
              <Label htmlFor="area">Área</Label>
              <Select
                value={editForm.area}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, area: value })
                }
              >
                <SelectTrigger id="area">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategy">Estrategia</SelectItem>
                  <SelectItem value="finance">Finanzas</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operaciones</SelectItem>
                  <SelectItem value="technology">Tecnología</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Inicio del Periodo</Label>
                <Input
                  id="period-start"
                  type="date"
                  value={editForm.period_start}
                  onChange={(e) =>
                    setEditForm({ ...editForm, period_start: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period-end">Fin del Periodo</Label>
                <Input
                  id="period-end"
                  type="date"
                  value={editForm.period_end}
                  onChange={(e) =>
                    setEditForm({ ...editForm, period_end: e.target.value })
                  }
                />
              </div>
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar KPI</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este KPI? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {deletingKPI && (
            <div className="py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold text-foreground">{deletingKPI.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Área: {deletingKPI.area} | Valor: {deletingKPI.value.toLocaleString()} {deletingKPI.unit}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo KPI</DialogTitle>
            <DialogDescription>
              Registra un nuevo indicador clave de rendimiento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nombre *</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Ej: Usuarios Registrados"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-area">Área *</Label>
                <Select
                  value={createForm.area}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, area: value })
                  }
                >
                  <SelectTrigger id="create-area">
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strategy">Estrategia</SelectItem>
                    <SelectItem value="finance">Finanzas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operaciones</SelectItem>
                    <SelectItem value="technology">Tecnología</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-value">Valor Actual *</Label>
                <Input
                  id="create-value"
                  type="number"
                  value={createForm.value}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, value: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-target">Meta</Label>
                <Input
                  id="create-target"
                  type="number"
                  value={createForm.target_value}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, target_value: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-unit">Unidad</Label>
              <Input
                id="create-unit"
                value={createForm.unit}
                onChange={(e) =>
                  setCreateForm({ ...createForm, unit: e.target.value })
                }
                placeholder="Ej: %, $, usuarios, ventas, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-period-start">Inicio del Periodo *</Label>
                <Input
                  id="create-period-start"
                  type="date"
                  value={createForm.period_start}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, period_start: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-period-end">Fin del Periodo *</Label>
                <Input
                  id="create-period-end"
                  type="date"
                  value={createForm.period_end}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, period_end: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateKPI} disabled={isSaving}>
              {isSaving ? "Creando..." : "Crear KPI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuggestedKPIsModal
        isOpen={isSuggestionsModalOpen}
        onClose={() => setIsSuggestionsModalOpen(false)}
        onKPIsCreated={() => {
          setIsSuggestionsModalOpen(false);
          refetch();
          toast({
            title: "KPIs creados",
            description: "Los KPIs sugeridos se han agregado correctamente",
          });
        }}
      />
    </MainLayout>
  );
}
