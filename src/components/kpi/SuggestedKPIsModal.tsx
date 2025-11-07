import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lightbulb, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SuggestedKPI {
  name: string;
  area: string;
  unit: string;
  suggested_target: number;
  rationale: string;
}

interface EditedKPI extends Partial<SuggestedKPI> {
  period_start?: string;
  period_end?: string;
}

interface SuggestedKPIsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKPIsCreated: () => void;
}

export function SuggestedKPIsModal({ isOpen, onClose, onKPIsCreated }: SuggestedKPIsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedKPI[]>([]);
  const [selectedKPIs, setSelectedKPIs] = useState<Set<number>>(new Set());
  const [editedKPIs, setEditedKPIs] = useState<Map<number, EditedKPI>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    } else {
      // Reset state when closing
      setSuggestions([]);
      setSelectedKPIs(new Set());
      setEditedKPIs(new Map());
      setError(null);
    }
  }, [isOpen]);

  const fetchSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('suggest-kpis', {
        body: {}
      });

      if (functionError) throw functionError;

      if (data.error) {
        if (data.code === 'NO_DIAGNOSIS') {
          setError(data.error);
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (data.success && data.suggested_kpis) {
        setSuggestions(data.suggested_kpis);
        // Seleccionar todos por defecto
        setSelectedKPIs(new Set(data.suggested_kpis.map((_: any, index: number) => index)));
        
        // Inicializar fechas por defecto
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const initialEdits = new Map<number, EditedKPI>();
        
        data.suggested_kpis.forEach((_: any, index: number) => {
          initialEdits.set(index, {
            period_start: today.toISOString().split('T')[0],
            period_end: endOfMonth.toISOString().split('T')[0],
          });
        });
        
        setEditedKPIs(initialEdits);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      toast({
        title: "Error",
        description: "No se pudieron generar las sugerencias de KPIs",
        variant: "destructive",
      });
      setError("Error al generar sugerencias. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const toggleKPI = (index: number) => {
    const newSelected = new Set(selectedKPIs);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedKPIs(newSelected);
  };

  const updateKPIField = (index: number, field: keyof EditedKPI, value: any) => {
    const newEdited = new Map(editedKPIs);
    const current = newEdited.get(index) || {};
    newEdited.set(index, { ...current, [field]: value });
    setEditedKPIs(newEdited);
  };

  const getKPIValue = (index: number, field: keyof SuggestedKPI): any => {
    const edited = editedKPIs.get(index);
    if (edited && edited[field] !== undefined) {
      return edited[field];
    }
    return suggestions[index][field];
  };

  const handleCreateKPIs = async () => {
    if (selectedKPIs.size === 0) {
      toast({
        title: "No hay KPIs seleccionados",
        description: "Selecciona al menos un KPI para crear",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      // Obtener company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.company_id) {
        throw new Error("No se encontró la empresa del usuario");
      }

      // Preparar KPIs para insertar
      const kpisToCreate = Array.from(selectedKPIs).map(index => {
        const original = suggestions[index];
        const edits = editedKPIs.get(index) || {};

        return {
          name: (edits.name || original.name).trim(),
          area: edits.area || original.area,
          value: 0, // Usuario llenará después
          target_value: edits.suggested_target ?? original.suggested_target,
          unit: (edits.unit || original.unit).trim(),
          company_id: profile.company_id,
          period_start: edits.period_start || new Date().toISOString().split('T')[0],
          period_end: edits.period_end || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
          source: "ai_suggestion",
        };
      });

      const { error: insertError } = await supabase
        .from('kpis')
        .insert(kpisToCreate);

      if (insertError) throw insertError;

      toast({
        title: "KPIs creados",
        description: `Se crearon ${kpisToCreate.length} KPIs exitosamente`,
      });

      onKPIsCreated();
    } catch (err) {
      console.error('Error creating KPIs:', err);
      toast({
        title: "Error",
        description: "No se pudieron crear los KPIs",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            KPIs Recomendados con AI
          </DialogTitle>
          <DialogDescription>
            Basado en tu diagnóstico y plan de acción, estos son los KPIs sugeridos para tu empresa
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generando recomendaciones personalizadas...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se generaron sugerencias
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {selectedKPIs.size} de {suggestions.length} KPIs seleccionados
            </div>

            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-6">
                {suggestions.map((kpi, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedKPIs.has(index) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedKPIs.has(index)}
                        onCheckedChange={() => toggleKPI(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Nombre</Label>
                            <Input
                              value={getKPIValue(index, 'name')}
                              onChange={(e) => updateKPIField(index, 'name', e.target.value)}
                              disabled={!selectedKPIs.has(index)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Área</Label>
                            <Select
                              value={getKPIValue(index, 'area')}
                              onValueChange={(value) => updateKPIField(index, 'area', value)}
                              disabled={!selectedKPIs.has(index)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
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

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Meta Sugerida</Label>
                            <Input
                              type="number"
                              value={getKPIValue(index, 'suggested_target')}
                              onChange={(e) => updateKPIField(index, 'suggested_target', parseFloat(e.target.value))}
                              disabled={!selectedKPIs.has(index)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Unidad</Label>
                            <Input
                              value={getKPIValue(index, 'unit')}
                              onChange={(e) => updateKPIField(index, 'unit', e.target.value)}
                              disabled={!selectedKPIs.has(index)}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Inicio del Periodo</Label>
                            <Input
                              type="date"
                              value={editedKPIs.get(index)?.period_start || ''}
                              onChange={(e) => updateKPIField(index, 'period_start', e.target.value)}
                              disabled={!selectedKPIs.has(index)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Fin del Periodo</Label>
                            <Input
                              type="date"
                              value={editedKPIs.get(index)?.period_end || ''}
                              onChange={(e) => updateKPIField(index, 'period_end', e.target.value)}
                              disabled={!selectedKPIs.has(index)}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded p-3 mt-2">
                          <p className="text-xs text-muted-foreground">
                            <strong>Por qué es importante:</strong> {kpi.rationale}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose} disabled={creating}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateKPIs} 
                disabled={selectedKPIs.size === 0 || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  `Crear ${selectedKPIs.size} KPIs seleccionados`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
