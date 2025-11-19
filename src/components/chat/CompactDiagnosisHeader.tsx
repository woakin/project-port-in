import { Building2, HelpCircle } from "lucide-react";
import ModeSelector from "./ModeSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type ChatMode = 'diagnosis' | 'strategic' | 'follow_up' | 'document';

interface CompactDiagnosisHeaderProps {
  companyName: string;
  companyStage?: string;
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const MODE_INFO = {
  diagnosis: "Evaluación estructurada área por área para identificar el estado actual de tu negocio y áreas de mejora prioritarias.",
  strategic: "Mentor estratégico para visión de largo plazo, frameworks empresariales y construcción de ventajas competitivas sostenibles.",
  operational: "Coach operativo enfocado en ejecución táctica, gestión de tareas y desbloqueo de obstáculos del día a día.",
  analyst: "Analista de datos especializado en interpretar métricas, documentos y tendencias para insights accionables."
};

const MODE_LABELS = {
  diagnosis: "Diagnóstico Completo",
  strategic: "Mentor Estratégico", 
  operational: "Coach Operativo",
  analyst: "Analista de Datos"
};

export function CompactDiagnosisHeader({ 
  companyName, 
  companyStage,
  currentMode,
  onModeChange 
}: CompactDiagnosisHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
      <div className="px-6 py-2.5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Company Info - Inline Compact */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-sm truncate">{companyName}</span>
              {companyStage && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground truncate">{companyStage}</span>
                </>
              )}
            </div>
          </div>

          {/* Mode Selector - Compact Tabs */}
          <div className="flex-1 flex justify-center min-w-0">
            <ModeSelector 
              currentMode={currentMode}
              onModeChange={onModeChange}
            />
          </div>

          {/* Help Button - Opens Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  {MODE_LABELS[currentMode as keyof typeof MODE_LABELS]}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {MODE_INFO[currentMode as keyof typeof MODE_INFO]}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
