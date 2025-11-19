import { Badge } from "@/components/ui/badge";

type PromptMode = 'diagnosis_style' | 'diagnosis_core' | 'strategic' | 'follow_up' | 'document';

interface PromptModeSelectorProps {
  activeMode: PromptMode;
  onChange: (mode: PromptMode) => void;
  unsavedChanges: Record<PromptMode, boolean>;
  promptsStatus?: Record<PromptMode, { isExplicitlySaved: boolean }>;
}

const MODE_LABELS: Record<PromptMode, string> = {
  diagnosis_style: 'Diagnóstico - Style ✏️',
  diagnosis_core: 'Diagnóstico - Core 🔒',
  strategic: 'Estratégico',
  follow_up: 'Seguimiento',
  document: 'Documentos'
};

export function PromptModeSelector({ activeMode, onChange, unsavedChanges, promptsStatus }: PromptModeSelectorProps) {
  return (
    <div className="flex gap-2 border-b border-border">
      {(Object.keys(MODE_LABELS) as PromptMode[]).map((mode) => {
        const isConfigured = promptsStatus?.[mode]?.isExplicitlySaved ?? false;
        
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`px-4 py-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeMode === mode
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {MODE_LABELS[mode]}
            <div className="flex items-center gap-1">
              {isConfigured ? (
                <span className="w-2 h-2 rounded-full bg-green-500" title="Configurado" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" title="Usando default" />
              )}
              {unsavedChanges[mode] && (
                <Badge 
                  variant="destructive" 
                  className="h-2 w-2 p-0 rounded-full"
                  title="Cambios sin guardar"
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}