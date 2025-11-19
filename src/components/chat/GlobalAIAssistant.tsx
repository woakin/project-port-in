import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, X, Sparkles, TrendingUp, CheckSquare, FileText, LayoutDashboard, Zap, Target, BarChart, Lightbulb, AlertCircle, Brain, Clock, Activity, FileCheck, Paperclip, Bot, User, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useProjectContext } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import { useFileUpload, ACCEPTED_FILE_TYPES, UploadedFileInfo } from '@/hooks/useFileUpload';

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/kpis': 'KPIs',
  '/tasks': 'Tareas',
  '/documents': 'Documentos',
  '/plans': 'Planes',
  '/diagnosticos': 'Diagnósticos',
};

const QUICK_ACTIONS: Record<string, Array<{ label: string; prompt: string; icon: any }>> = {
  '/': [
    { label: 'Resumir métricas', prompt: 'Resume las métricas clave del dashboard', icon: BarChart },
    { label: 'Analizar tendencias', prompt: 'Analiza las tendencias principales que veo en el dashboard', icon: TrendingUp },
    { label: 'Próximas acciones', prompt: '¿Cuáles son las 3 acciones prioritarias que debo tomar esta semana?', icon: Zap },
    { label: 'Estado del proyecto', prompt: 'Dame un resumen ejecutivo del estado actual del proyecto', icon: Target },
  ],
  '/kpis': [
    { label: 'Explicar KPI', prompt: 'Explica el KPI que estoy viendo actualmente', icon: TrendingUp },
    { label: 'Sugerir mejora', prompt: 'Sugiere cómo puedo mejorar este KPI', icon: Lightbulb },
    { label: 'Comparar con objetivo', prompt: 'Compara el valor actual del KPI con su objetivo y analiza la brecha', icon: Target },
    { label: 'Proyección próxima', prompt: '¿Vamos a cumplir el objetivo de este KPI? Proyecta los próximos 3 meses', icon: TrendingUp },
  ],
  '/tasks': [
    { label: 'Tareas urgentes', prompt: 'Muéstrame las 5 tareas más urgentes con sus fechas límite y estado', icon: Zap },
    { label: 'Tareas atrasadas', prompt: '¿Qué tareas están atrasadas y qué debo priorizar?', icon: AlertCircle },
    { label: 'Resumen semanal', prompt: 'Resume el progreso de tareas de esta semana', icon: CheckSquare },
    { label: 'Sugerir priorización', prompt: 'Basándote en las tareas pendientes, ¿qué debería hacer primero?', icon: Brain },
  ],
  '/documents': [
    { label: 'Sin analizar', prompt: '¿Cuántos documentos tengo pendientes de análisis?', icon: Clock },
    { label: 'Resumen insights', prompt: 'Resume los principales insights de los documentos analizados', icon: Sparkles },
    { label: 'Por categoría', prompt: 'Muéstrame la distribución de documentos por categoría', icon: BarChart },
  ],
  '/plans': [
    { label: 'Plan más reciente', prompt: 'Resume el plan de acción más reciente y su progreso', icon: FileText },
    { label: 'Planes activos', prompt: '¿Cuántos planes tengo activos y cuál requiere más atención?', icon: Activity },
    { label: 'Próximos hitos', prompt: '¿Cuáles son los próximos hitos importantes de mis planes activos?', icon: Target },
  ],
  '/diagnosticos': [
    { label: 'Último diagnóstico', prompt: 'Resume los hallazgos del último diagnóstico realizado', icon: FileCheck },
    { label: 'Evolución', prompt: '¿Cómo ha evolucionado mi negocio desde el primer diagnóstico?', icon: TrendingUp },
  ],
};

export function GlobalAIAssistant() {
  const { isOpen, close, messages, addMessage, context, updateContext, clearMessages } = useAIAssistant();
  const { currentProject } = useProjectContext();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(location.pathname);
  
  // File upload states
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedFileInfo[]>([]);
  const { uploadFilesForChat, uploading, MAX_FILE_SIZE, MAX_FILES_PER_MESSAGE } = useFileUpload();
  
  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles) => {
      const newFiles = [...attachedFiles, ...acceptedFiles].slice(0, MAX_FILES_PER_MESSAGE);
      setAttachedFiles(newFiles);
      if (acceptedFiles.length + attachedFiles.length > MAX_FILES_PER_MESSAGE) {
        toast.warning(`Máximo ${MAX_FILES_PER_MESSAGE} archivos por mensaje`);
      }
    },
    accept: ACCEPTED_FILE_TYPES as any,
    maxSize: MAX_FILE_SIZE,
    noClick: true,
    noKeyboard: true,
    multiple: true,
    maxFiles: MAX_FILES_PER_MESSAGE
  });

  // Update context when location or project changes
  useEffect(() => {
    updateContext({
      page: location.pathname,
      projectId: currentProject?.id || null,
      projectName: currentProject?.name || null,
    });
  }, [location.pathname, currentProject, updateContext]);

  // Close on mobile when navigating
  useEffect(() => {
    if (isMobile && location.pathname !== previousPath.current) {
      close();
      if (isOpen) {
        toast.info('Chat guardado', { description: 'Puedes continuar la conversación después' });
      }
    }
    previousPath.current = location.pathname;
  }, [location.pathname, isMobile, close, isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Greeting message when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const pageName = PAGE_NAMES[location.pathname] || 'la aplicación';
      addMessage({
        role: 'assistant',
        content: `¡Hola! Estás en la página de **${pageName}**${currentProject ? ` del proyecto **${currentProject.name}**` : ''}. ¿En qué puedo ayudarte?`,
      });
    }
  }, [isOpen]);

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming || uploading) return;

    const userMessage = input.trim() || '📎 [Archivos adjuntos]';
    
    // Upload files first if any
    let uploadedFileInfo: UploadedFileInfo[] = [];
    if (attachedFiles.length > 0) {
      uploadedFileInfo = await uploadFilesForChat(attachedFiles);
      if (uploadedFileInfo.length === 0) return;
      setUploadedDocs(uploadedFileInfo);
    }

    const currentMessages = [...messages, { role: 'user' as const, content: userMessage }];
    
    setInput('');
    setAttachedFiles([]);
    addMessage({ role: 'user', content: userMessage });
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Debes iniciar sesión para usar el asistente');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: currentMessages,
            context: {
              currentPage: context.page,
              project: currentProject ? { id: currentProject.id, name: currentProject.name } : null,
              focus: context.focus,
              data: context.data,
            },
            mode: 'contextual',
            attachedDocuments: uploadedFileInfo.length > 0 ? uploadedFileInfo : undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Límite de solicitudes excedido', { description: 'Por favor intenta de nuevo más tarde' });
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos insuficientes', { description: 'Por favor agrega fondos a tu workspace' });
          return;
        }
        throw new Error('Error en la respuesta del servidor');
      }

      // Check for data updates and dispatch events
      const dataUpdated = response.headers.get('x-data-updated') === '1';
      const updatedEntities = response.headers.get('x-updated-entities')?.split(',').filter(Boolean) || [];
      
      if (dataUpdated && updatedEntities.length > 0) {
        updatedEntities.forEach(entity => {
          console.log(`Dispatching ${entity}-updated event`);
          window.dispatchEvent(new CustomEvent(`${entity}-updated`));
        });
        
        toast.success('Cambios aplicados', {
          description: `Se actualizaron: ${updatedEntities.join(', ')}`
        });
      }

      if (!response.body) {
        throw new Error('No se recibió respuesta del servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              // This will replace the last assistant message or add a new one
              addMessage({ role: 'assistant', content: assistantMessage });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              addMessage({ role: 'assistant', content: assistantMessage });
            }
          } catch {
            // ignore
          }
        }
      }

      // Notificar a la página de KPIs para que recargue datos si hubo actualizaciones
      if (assistantMessage.includes('ACTUALIZACIONES REALIZADAS') && location.pathname === '/kpis') {
        window.dispatchEvent(new CustomEvent('kpis-updated'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje', { description: 'Por favor intenta de nuevo' });
    } finally {
      setIsStreaming(false);
      setUploadedDocs([]);
    }
  };

  const handleQuickAction = async (prompt: string) => {
    if (isStreaming) return;
    
    setInput('');
    addMessage({ role: 'user', content: prompt });
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Debes iniciar sesión para usar el asistente');
        return;
      }

      const currentMessages = [...messages, { role: 'user', content: prompt }];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: currentMessages,
            context: {
              currentPage: context.page,
              project: currentProject ? { id: currentProject.id, name: currentProject.name } : null,
              focus: context.focus,
              data: context.data,
            },
            mode: 'contextual',
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Límite de solicitudes excedido', { description: 'Por favor intenta de nuevo más tarde' });
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos insuficientes', { description: 'Por favor agrega fondos a tu workspace' });
          return;
        }
        throw new Error('Error en la respuesta del servidor');
      }

      const dataUpdated = response.headers.get('x-data-updated') === '1';
      const updatedEntities = response.headers.get('x-updated-entities')?.split(',').filter(Boolean) || [];
      
      if (dataUpdated && updatedEntities.length > 0) {
        updatedEntities.forEach(entity => {
          console.log(`Dispatching ${entity}-updated event`);
          window.dispatchEvent(new CustomEvent(`${entity}-updated`));
        });
        
        toast.success('Cambios aplicados', {
          description: `Se actualizaron: ${updatedEntities.join(', ')}`
        });
      }

      if (!response.body) {
        throw new Error('No se recibió respuesta del servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              addMessage({ role: 'assistant', content: assistantMessage });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              addMessage({ role: 'assistant', content: assistantMessage });
            }
          } catch {
            // ignore
          }
        }
      }

      // Notificar a la página de KPIs si hubo actualizaciones aplicadas
      if (assistantMessage.includes('ACTUALIZACIONES REALIZADAS') && location.pathname === '/kpis') {
        window.dispatchEvent(new CustomEvent('kpis-updated'));
      }
    } catch (error) {
      console.error('Error sending quick action message:', error);
      toast.error('Error al enviar mensaje', { description: 'Por favor intenta de nuevo' });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentPageName = PAGE_NAMES[location.pathname] || location.pathname;
  const quickActions = QUICK_ACTIONS[location.pathname] || [];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent 
        side="right" 
        className={`flex flex-col ${isMobile ? 'w-full' : 'w-[45%] min-w-[500px]'} p-0`}
      >
        <SheetHeader className="border-b border-border p-4 space-y-3">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Alasha AI
          </SheetTitle>
          <SheetDescription className="text-left">
            Estás en: <span className="font-semibold text-foreground">{currentPageName}</span>
            {currentProject && (
              <span className="ml-1">
                · <span className="font-semibold text-foreground">{currentProject.name}</span>
              </span>
            )}
          </SheetDescription>
          
          {quickActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isStreaming}
                >
                  <action.icon className="h-3 w-3" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </SheetHeader>

        <div 
          {...getRootProps({ onClick: (e) => e.stopPropagation() })} 
          className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        >
          <input {...getInputProps()} />
          
          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm z-50 rounded-lg border-2 border-dashed border-primary m-2">
              <div className="text-center p-8 bg-background/80 rounded-lg">
                <Paperclip className="w-16 h-16 mx-auto mb-4 text-primary animate-bounce" />
                <p className="text-xl font-semibold text-primary mb-2">Suelta los archivos aquí</p>
                <p className="text-sm text-muted-foreground">
                  Máximo {MAX_FILES_PER_MESSAGE} archivos • 20MB cada uno
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, Office, imágenes, TXT, CSV
                </p>
              </div>
            </div>
          )}
          
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-4 space-y-3">
          {/* File attachments display */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Archivos adjuntos ({attachedFiles.length}/{MAX_FILES_PER_MESSAGE})
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachedFiles.reduce((acc, f) => acc + f.size, 0))} total
                </span>
              </div>
              <div className="space-y-1.5">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-background rounded border border-border hover:border-primary/50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(idx)}
                      disabled={uploading}
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                      title="Quitar archivo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Subiendo y analizando archivos...</span>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={open}
              disabled={isStreaming || uploading || attachedFiles.length >= MAX_FILES_PER_MESSAGE}
              className="shrink-0"
              title="Adjuntar archivos"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedFiles.length > 0 
                  ? "Mensaje opcional... (Enter para enviar)" 
                  : "Escribe tu mensaje... (Enter para enviar)"
              }
              className="resize-none min-h-[60px]"
              disabled={isStreaming || uploading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isStreaming || uploading || (!input.trim() && attachedFiles.length === 0)}
              size="icon"
              className="shrink-0"
              title={uploading ? "Subiendo archivos..." : "Enviar mensaje"}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
