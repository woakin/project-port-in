import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart3, ListTodo, FileText, History, Zap } from 'lucide-react';

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
    onOpenSheet?.(action.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
