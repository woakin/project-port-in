import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  variant?: 'content' | 'service' | 'testimonial';
  className?: string;
}

export function Card({ children, variant = 'content', className }: CardProps) {
  const variantStyles = {
    content: 'bg-card p-8 gap-6',
    service: 'bg-card p-6 gap-4',
    testimonial: 'bg-secondary p-8 gap-6',
  };

  return (
    <div className={cn(
      "rounded-md flex flex-col",
      variantStyles[variant],
      className
    )}>
      {children}
    </div>
  );
}
