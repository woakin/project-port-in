import { Button } from '@/components/ui/button';
import { BarChart3, ListTodo, FileText, History } from 'lucide-react';

export type SheetType = 'kpis' | 'tasks' | 'documents' | 'diagnoses' | null;

interface QuickActionsProps {
  projectId?: string;
  onActionClick?: (action: string) => void;
  onOpenSheet?: (sheet: SheetType) => void;
}

export default function QuickActions({ projectId, onActionClick, onOpenSheet }: QuickActionsProps) {
  const actions = [
    {
      id: 'kpis' as const,
      icon: BarChart3,
      label: 'Ver KPIs',
      prompt: 'Ver mis KPIs actuales'
    },
    {
      id: 'tasks' as const,
      icon: ListTodo,
      label: 'Ver Tareas',
      prompt: 'Muéstrame mis tareas pendientes'
    },
    {
      id: 'documents' as const,
      icon: FileText,
      label: 'Documentos',
      prompt: 'Analiza mis documentos recientes'
    },
    {
      id: 'diagnoses' as const,
      icon: History,
      label: 'Historial',
      prompt: 'Muéstrame el historial de diagnósticos'
    }
  ];

  const handleActionClick = (action: typeof actions[0]) => {
    // Solo abrimos el panel, sin enviar mensaje al chat
    onOpenSheet?.(action.id);
  };

  return (
    <div className="flex gap-2 p-3 bg-muted/50 border-y border-border overflow-x-auto">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => handleActionClick(action)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
