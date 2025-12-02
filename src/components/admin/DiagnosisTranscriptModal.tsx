import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bot, User, Clock, Calendar, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatTranscript {
  messages: ChatMessage[];
  areas_covered: string[];
  duration_minutes?: number;
  started_at?: string;
  completed_at?: string;
}

interface DiagnosisTranscriptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: ChatTranscript | null;
  diagnosisDate: string;
  companyName?: string;
}

const AREA_NAMES: Record<string, string> = {
  strategy: 'Estrategia',
  operations: 'Operaciones',
  finance: 'Finanzas',
  marketing: 'Marketing',
  legal: 'Legal',
  technology: 'Tecnología'
};

export function DiagnosisTranscriptModal({
  open,
  onOpenChange,
  transcript,
  diagnosisDate,
  companyName
}: DiagnosisTranscriptModalProps) {
  if (!transcript) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Transcripción del Diagnóstico
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Transcripción no disponible</p>
            <p className="text-sm mt-2">
              Este diagnóstico fue realizado antes de que se implementara el guardado de transcripciones.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Transcripción del Diagnóstico
            {companyName && (
              <span className="text-muted-foreground font-normal">- {companyName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(diagnosisDate)}
          </div>
          {transcript.duration_minutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {transcript.duration_minutes} min
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            {transcript.messages.length} mensajes
          </div>
        </div>

        {/* Areas covered */}
        {transcript.areas_covered && transcript.areas_covered.length > 0 && (
          <div className="flex flex-wrap gap-2 py-2">
            <span className="text-sm text-muted-foreground">Áreas cubiertas:</span>
            {transcript.areas_covered.map(area => (
              <Badge key={area} variant="secondary" className="text-xs">
                {AREA_NAMES[area] || area}
              </Badge>
            ))}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-4 py-4">
            {transcript.messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
