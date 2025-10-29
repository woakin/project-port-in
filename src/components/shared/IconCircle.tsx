import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconCircleProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const iconSizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function IconCircle({ icon: Icon, size = 'md', className }: IconCircleProps) {
  return (
    <div className={cn(
      "rounded-full icon-gradient-bg flex items-center justify-center flex-shrink-0",
      sizeClasses[size],
      className
    )}>
      <Icon className={cn("text-white", iconSizeClasses[size])} />
    </div>
  );
}
