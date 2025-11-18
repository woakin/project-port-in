import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  variant?: 'content' | 'service' | 'testimonial';
  className?: string;
  onClick?: () => void;
}

export function Card({ children, variant = 'content', className, onClick }: CardProps) {
  const variantStyles = {
    content: 'bg-card p-8 gap-6 border border-border',
    service: 'bg-card p-6 gap-4 border border-border',
    testimonial: 'bg-secondary p-8 gap-6 border border-border',
  };

  return (
    <div 
      className={cn(
        "rounded-xl flex flex-col shadow-sm",
        variantStyles[variant],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
