import { MessageSquare, Target, TrendingUp, FileText } from 'lucide-react';

type ChatMode = 'diagnosis' | 'strategic' | 'follow_up' | 'document';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const modes = [
  {
    id: 'diagnosis' as ChatMode,
    icon: MessageSquare,
    label: 'Diagnóstico',
    description: 'Genera diagnóstico y plan completo',
    color: 'text-primary'
  },
  {
    id: 'strategic' as ChatMode,
    icon: Target,
    label: 'Mentor Estratégico',
    description: 'Visión de largo plazo y dirección',
    color: 'text-blue-500'
  },
  {
    id: 'follow_up' as ChatMode,
    icon: TrendingUp,
    label: 'Coach Operativo',
    description: 'Ejecución táctica y priorización',
    color: 'text-green-500'
  },
  {
    id: 'document' as ChatMode,
    icon: FileText,
    label: 'Analista de Datos',
    description: 'Insights de datos y documentos',
    color: 'text-orange-500'
  }
];

export default function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-card border-b border-border overflow-x-auto">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-md transition-all whitespace-nowrap
              ${isActive 
                ? 'text-primary font-medium' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{mode.label}</span>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
