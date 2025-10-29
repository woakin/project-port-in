import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromptDefaultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: string;
  defaultPrompt: string;
  onUseAsBase: () => void;
}

export function PromptDefaultModal({
  open,
  onOpenChange,
  mode,
  defaultPrompt,
  onUseAsBase
}: PromptDefaultModalProps) {
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(defaultPrompt);
    toast({
      title: "Copiado",
      description: "Prompt copiado al portapapeles",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prompt por Defecto - {mode}
          </DialogTitle>
          <DialogDescription>
            Este es el prompt original hardcodeado en el sistema. Puedes usarlo como base para crear tu versión personalizada.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {defaultPrompt || 'No hay prompt por defecto disponible para este modo.'}
          </pre>
        </ScrollArea>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                onUseAsBase();
                onOpenChange(false);
              }}
            >
              Usar como Base
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}