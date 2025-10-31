import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const pageContextMap: Record<string, string> = {
  "/": "Dashboard principal - Vista general de KPIs, tareas y diagnósticos",
  "/kpis": "Página de KPIs - Gestión y monitoreo de indicadores clave",
  "/tasks": "Página de Tareas - Gestión de tareas y proyectos",
  "/documents": "Página de Documentos - Gestión documental",
  "/plans": "Página de Planes - Planes de acción estratégicos",
  "/diagnosticos": "Página de Diagnósticos - Historial de diagnósticos",
};

export function AIAssistant() {
  const { isOpen, closeAssistant } = useAIAssistant();
  const { currentProject } = useProjectContext();
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPageContext = pageContextMap[location.pathname] || "Navegación general";

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const contextMessage = `Hola! Soy Alasha AI. Actualmente estás en: ${currentPageContext}. ¿En qué puedo ayudarte?`;
      setMessages([
        {
          role: "assistant",
          content: contextMessage,
        },
      ]);
    }
  }, [isOpen, currentPageContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setSending(true);

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const contextPrompt = `Contexto actual: El usuario está en "${currentPageContext}". 
Proyecto: ${currentProject?.name || "Sin proyecto seleccionado"}.
Consulta del usuario: ${userMessage}`;

      const { data, error } = await supabase.functions.invoke("chat-diagnosis", {
        body: {
          message: contextPrompt,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      if (data?.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeAssistant}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Asistente IA
          </SheetTitle>
          <SheetDescription>{currentPageContext}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <p className="text-sm text-muted-foreground">Escribiendo...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t pt-4 flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="resize-none"
            rows={3}
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sending}
            size="icon"
            className="h-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
