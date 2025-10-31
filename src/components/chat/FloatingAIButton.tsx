import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIAssistant } from "@/contexts/AIAssistantContext";

interface FloatingAIButtonProps {
  showBadge?: boolean;
}

export function FloatingAIButton({ showBadge = false }: FloatingAIButtonProps) {
  const { open } = useAIAssistant();

  return (
    <Button
      size="lg"
      variant="gradient"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
      onClick={open}
      aria-label="Abrir asistente de IA"
    >
      <MessageCircle className="h-6 w-6" />
      {showBadge && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
      )}
    </Button>
  );
}
