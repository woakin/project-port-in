import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-color-success-light text-color-success-default',
    error: 'bg-color-error-light text-color-error-default',
    warning: 'bg-color-warning-light text-color-warning-default',
  };

  return (
    <div className={cn(
      "px-3 py-1 rounded-sm inline-flex items-center gap-1.5 text-sm",
      variantStyles[variant],
      className
    )}>
      {children}
    </div>
  );
}
