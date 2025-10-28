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
    label: 'Consulta Estratégica',
    description: 'Preguntas puntuales de estrategia',
    color: 'text-blue-500'
  },
  {
    id: 'follow_up' as ChatMode,
    icon: TrendingUp,
    label: 'Seguimiento',
    description: 'Revisión de plan y progreso',
    color: 'text-green-500'
  },
  {
    id: 'document' as ChatMode,
    icon: FileText,
    label: 'Análisis de Docs',
    description: 'Insights de documentos subidos',
    color: 'text-orange-500'
  }
];

export default function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card border-b border-border">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${isActive 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50 bg-background'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : mode.color}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{mode.label}</p>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
