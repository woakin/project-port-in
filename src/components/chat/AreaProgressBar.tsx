import { Check, Target, Cog, DollarSign, TrendingUp, Scale, Laptop, SkipForward, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AreaProgressBarProps {
  areas: Array<{
    id: string;
    name: string;
    icon: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  }>;
  currentIndex: number;
  onGoToArea: (index: number) => void;
  onSkipArea?: () => void;
  onNextArea?: () => void;
  onGenerateDiagnosis?: () => void;
  canAdvance?: boolean;
  canGenerate?: boolean;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Cog,
  DollarSign,
  TrendingUp,
  Scale,
  Laptop
};

export function AreaProgressBar({ 
  areas, 
  currentIndex, 
  onGoToArea,
  onSkipArea,
  onNextArea,
  onGenerateDiagnosis,
  canAdvance,
  canGenerate,
  isLoading
}: AreaProgressBarProps) {
  const completedCount = areas.filter(a => a.status === 'completed').length;
  const percentage = Math.round((completedCount / areas.length) * 100);
  
  return (
    <div className="w-full bg-muted/50 border-b border-border py-2 px-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto gap-4">
        {/* Progreso (izquierda) */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Progreso:</span>
          <div className="flex items-center gap-1.5">
            {areas.map((area, idx) => {
              const Icon = iconMap[area.icon] || Target;
              const isClickable = idx <= currentIndex;
              
              return (
                <button
                  key={area.id}
                  onClick={() => isClickable && onGoToArea(idx)}
                  disabled={!isClickable}
                  title={area.name}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all flex items-center justify-center relative",
                    area.status === 'completed' && "bg-green-500 text-white",
                    area.status === 'in_progress' && "bg-primary text-white animate-pulse",
                    area.status === 'skipped' && "bg-muted-foreground/30 text-muted-foreground",
                    area.status === 'pending' && "bg-muted text-muted-foreground/50",
                    isClickable && "cursor-pointer hover:scale-110 hover:shadow-md",
                    !isClickable && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {area.status === 'completed' && (
                    <Check className="h-3 w-3 absolute -top-0.5 -right-0.5 bg-white text-green-600 rounded-full p-0.5" />
                  )}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {percentage}% ({completedCount}/{areas.length})
          </span>
        </div>

        {/* Botones de acción (derecha) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Botón Saltar */}
          {onSkipArea && currentIndex < areas.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSkipArea}
              disabled={isLoading}
              className="gap-1.5"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Saltar área</span>
            </Button>
          )}

          {/* Botón Avanzar */}
          {onNextArea && canAdvance && (
            <Button
              size="sm"
              onClick={onNextArea}
              disabled={isLoading}
              className="gap-1.5"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Siguiente área</span>
            </Button>
          )}

          {/* Botón Generar Diagnóstico */}
          {onGenerateDiagnosis && canGenerate && (
            <Button
              size="sm"
              onClick={onGenerateDiagnosis}
              disabled={isLoading}
              className="gap-1.5 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Generar</span>
              <span className="inline sm:hidden">✓</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
