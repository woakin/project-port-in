import { Check, Target, Cog, DollarSign, TrendingUp, Scale, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AreaProgressBarProps {
  areas: Array<{
    id: string;
    name: string;
    icon: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  }>;
  currentIndex: number;
  onGoToArea: (index: number) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Cog,
  DollarSign,
  TrendingUp,
  Scale,
  Laptop
};

export function AreaProgressBar({ areas, currentIndex, onGoToArea }: AreaProgressBarProps) {
  const completedCount = areas.filter(a => a.status === 'completed').length;
  const percentage = Math.round((completedCount / areas.length) * 100);
  
  return (
    <div className="w-full bg-muted/50 border-b border-border py-2 px-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-medium text-muted-foreground">Progreso:</span>
          <div className="flex items-center gap-1">
            {areas.map((area, idx) => {
              const isClickable = idx <= currentIndex;
              
              return (
                <button
                  key={area.id}
                  onClick={() => isClickable && onGoToArea(idx)}
                  disabled={!isClickable}
                  title={area.name}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    area.status === 'completed' && "bg-green-500",
                    area.status === 'in_progress' && "bg-primary animate-pulse",
                    area.status === 'skipped' && "bg-muted-foreground/50",
                    area.status === 'pending' && "bg-muted",
                    isClickable && "cursor-pointer hover:scale-125",
                    !isClickable && "opacity-40 cursor-not-allowed"
                  )}
                />
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            {percentage}% ({completedCount}/{areas.length} áreas)
          </span>
        </div>
      </div>
    </div>
  );
}
