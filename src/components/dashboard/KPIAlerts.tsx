import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Trash2, Plus } from "lucide-react";
import { useKPIAlerts } from "@/hooks/useKPIAlerts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useKPIs } from "@/hooks/useKPIs";
import { useToast } from "@/hooks/use-toast";

export function KPIAlerts() {
  const { alerts, loading, createAlert, deleteAlert, updateAlert } = useKPIAlerts();
  const { kpis, getLatestKPIs } = useKPIs();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    kpi_id: '',
    condition: 'above' as 'above' | 'below' | 'equal',
    threshold: 0,
    notification_channel: 'in_app' as 'email' | 'in_app' | 'slack',
  });

  const latestKPIs = getLatestKPIs();
  const activeAlerts = alerts.filter(a => a.is_active);

  const handleCreateAlert = async () => {
    try {
      await createAlert({
        ...newAlert,
        is_active: true,
        user_id: '', // Will be set by hook
      });
      setIsDialogOpen(false);
      setNewAlert({
        kpi_id: '',
        condition: 'above',
        threshold: 0,
        notification_channel: 'in_app',
      });
      toast({
        title: "Alerta creada",
        description: "La alerta se ha configurado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la alerta",
        variant: "destructive",
      });
    }
  };

  const handleToggleAlert = async (id: string, isActive: boolean) => {
    try {
      await updateAlert(id, { is_active: !isActive });
      toast({
        title: isActive ? "Alerta desactivada" : "Alerta activada",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la alerta",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await deleteAlert(id);
      toast({
        title: "Alerta eliminada",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la alerta",
        variant: "destructive",
      });
    }
  };

  const getKPIName = (kpiId: string) => {
    const kpi = kpis.find(k => k.id === kpiId);
    return kpi ? kpi.name : 'KPI';
  };

  const getConditionLabel = (condition: string) => {
    const labels = {
      above: 'mayor que',
      below: 'menor que',
      equal: 'igual a',
    };
    return labels[condition as keyof typeof labels] || condition;
  };

  return (
    <Card variant="content">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Alertas de KPIs</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Alerta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Alerta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="kpi">KPI</Label>
                <Select
                  value={newAlert.kpi_id}
                  onValueChange={(value) => setNewAlert({ ...newAlert, kpi_id: value })}
                >
                  <SelectTrigger id="kpi">
                    <SelectValue placeholder="Selecciona un KPI" />
                  </SelectTrigger>
                  <SelectContent>
                    {latestKPIs.map((kpi) => (
                      <SelectItem key={kpi.id} value={kpi.id}>
                        {kpi.name} ({kpi.area})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condición</Label>
                <Select
                  value={newAlert.condition}
                  onValueChange={(value: any) => setNewAlert({ ...newAlert, condition: value })}
                >
                  <SelectTrigger id="condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Mayor que</SelectItem>
                    <SelectItem value="below">Menor que</SelectItem>
                    <SelectItem value="equal">Igual a</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Valor umbral</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Canal de notificación</Label>
                <Select
                  value={newAlert.notification_channel}
                  onValueChange={(value: any) => setNewAlert({ ...newAlert, notification_channel: value })}
                >
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">En la aplicación</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateAlert} className="w-full">
                Crear Alerta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando alertas...</div>
      ) : alerts.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No hay alertas configuradas
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3 rounded-md border border-border bg-secondary/30"
            >
              <div className="flex items-center gap-3 flex-1">
                {alert.is_active ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {getKPIName(alert.kpi_id)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Notificar cuando sea {getConditionLabel(alert.condition)} {alert.threshold}
                  </div>
                </div>
                <Badge variant={alert.is_active ? 'success' : 'default'} className="text-xs">
                  {alert.is_active ? 'Activa' : 'Pausada'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                >
                  {alert.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAlert(alert.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {activeAlerts.length} alerta{activeAlerts.length !== 1 ? 's' : ''} activa{activeAlerts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </Card>
  );
}
