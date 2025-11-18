import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  TrendingUp, 
  CheckSquare, 
  MessageSquare,
  Stethoscope,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  color: string;
}

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      icon: Stethoscope,
      label: "Nuevo Diagnóstico",
      action: () => navigate('/chat-diagnosis'),
      color: "bg-primary hover:bg-primary-light"
    },
    {
      icon: TrendingUp,
      label: "Agregar KPI",
      action: () => navigate('/kpis'),
      color: "bg-secondary hover:bg-secondary-light"
    },
    {
      icon: CheckSquare,
      label: "Crear Tarea",
      action: () => navigate('/tasks'),
      color: "bg-accent hover:bg-accent/90"
    },
    {
      icon: MessageSquare,
      label: "Chat IA",
      action: () => navigate('/chat-diagnosis'),
      color: "bg-primary hover:bg-primary-light"
    }
  ];

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action Buttons */}
        {isOpen && (
          <div className="flex flex-col-reverse gap-2 animate-fade-in">
            {actions.map((action, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110",
                      action.color
                    )}
                    onClick={() => handleActionClick(action.action)}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all",
                isOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary-light"
              )}
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Plus className="h-6 w-6 text-white" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isOpen ? "Cerrar acciones" : "Acciones rápidas"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}