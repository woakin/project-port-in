import { Card } from "@/components/shared/Card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  unit?: string;
}

export function KPICard({ title, value, change, unit }: KPICardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="h-4 w-4" />;
    if (change > 0) return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground';
    if (change > 0) return 'text-color-success-default';
    return 'text-color-error-default';
  };

  return (
    <Card variant="content" className="p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
}
