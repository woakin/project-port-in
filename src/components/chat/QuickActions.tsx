import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, ListTodo, FileText, History } from 'lucide-react';

interface QuickActionsProps {
  projectId?: string;
  onActionClick?: (action: string) => void;
}

export default function QuickActions({ projectId, onActionClick }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'kpis',
      icon: BarChart3,
      label: 'Ver KPIs',
      onClick: () => {
        onActionClick?.('Ver mis KPIs actuales');
        navigate('/');
      }
    },
    {
      id: 'tasks',
      icon: ListTodo,
      label: 'Ver Tareas',
      onClick: () => {
        onActionClick?.('Muéstrame mis tareas pendientes');
        navigate('/tasks');
      }
    },
    {
      id: 'documents',
      icon: FileText,
      label: 'Documentos',
      onClick: () => {
        onActionClick?.('Analiza mis documentos recientes');
        navigate('/documents');
      }
    },
    {
      id: 'diagnoses',
      icon: History,
      label: 'Historial',
      onClick: () => {
        onActionClick?.('Muéstrame el historial de diagnósticos');
        navigate('/diagnosticos');
      }
    }
  ];

  return (
    <div className="flex gap-2 p-3 bg-muted/50 border-y border-border overflow-x-auto">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={action.onClick}
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
