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
  return (
    <div className="w-full bg-muted/50 border-b border-border py-4 px-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {areas.map((area, idx) => {
          const Icon = iconMap[area.icon];
          const isClickable = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          
          return (
            <div key={area.id} className="flex items-center">
              <button
                onClick={() => isClickable && onGoToArea(idx)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all",
                  isClickable ? "cursor-pointer hover:scale-110" : "opacity-40 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  area.status === 'completed' && "bg-green-500 text-white",
                  area.status === 'in_progress' && "bg-primary text-primary-foreground animate-pulse",
                  area.status === 'skipped' && "bg-muted text-muted-foreground",
                  area.status === 'pending' && "bg-muted/50 text-muted-foreground"
                )}>
                  {area.status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}>
                  {area.name}
                </span>
              </button>
              
              {idx < areas.length - 1 && (
                <div className={cn(
                  "h-[2px] w-8 mx-2 transition-colors",
                  idx < currentIndex ? "bg-green-500" : "bg-muted"
                )}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
