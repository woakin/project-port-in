import { Badge } from "@/components/ui/badge";

type PromptMode = 'diagnosis' | 'strategic' | 'follow_up' | 'document';

interface PromptModeSelectorProps {
  activeMode: PromptMode;
  onChange: (mode: PromptMode) => void;
  unsavedChanges: Record<PromptMode, boolean>;
}

const MODE_LABELS: Record<PromptMode, string> = {
  diagnosis: 'Diagnóstico',
  strategic: 'Estratégico',
  follow_up: 'Seguimiento',
  document: 'Documentos'
};

export function PromptModeSelector({ activeMode, onChange, unsavedChanges }: PromptModeSelectorProps) {
  return (
    <div className="flex gap-2 border-b border-border">
      {(Object.keys(MODE_LABELS) as PromptMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeMode === mode
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {MODE_LABELS[mode]}
          {unsavedChanges[mode] && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-2 w-2 p-0 rounded-full"
              title="Cambios sin guardar"
            />
          )}
        </button>
      ))}
    </div>
  );
}