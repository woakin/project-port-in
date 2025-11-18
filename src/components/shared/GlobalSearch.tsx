import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Search, 
  TrendingUp, 
  CheckSquare, 
  FileText, 
  LayoutDashboard,
  Stethoscope,
  FolderKanban,
  Calculator
} from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { kpis } = useKPIs();
  const { tasks } = useTasks();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!user) return null;

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  // Get unique KPI names
  const uniqueKPIs = Array.from(new Set(kpis.map(k => k.name))).slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar en Alasha AI..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        
        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => handleSelect(() => navigate('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/kpis'))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>KPIs</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/tasks'))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Tareas</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/plans'))}>
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Planes</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/documents'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documentos</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/diagnosticos'))}>
            <Stethoscope className="mr-2 h-4 w-4" />
            <span>Diagnósticos</span>
          </CommandItem>
        </CommandGroup>

        {uniqueKPIs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="KPIs Recientes">
              {uniqueKPIs.map((kpiName) => (
                <CommandItem
                  key={kpiName}
                  onSelect={() => handleSelect(() => navigate('/kpis'))}
                >
                  <Calculator className="mr-2 h-4 w-4 text-primary" />
                  <span>{kpiName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tareas Recientes">
              {tasks.slice(0, 5).map((task) => (
                <CommandItem
                  key={task.id}
                  onSelect={() => handleSelect(() => navigate('/tasks'))}
                >
                  <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                  <span className="truncate">{task.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Acciones Rápidas">
          <CommandItem onSelect={() => handleSelect(() => navigate('/chat-diagnosis'))}>
            <span className="text-sm text-muted-foreground">Nuevo Diagnóstico</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/kpis'))}>
            <span className="text-sm text-muted-foreground">Agregar KPI</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/tasks'))}>
            <span className="text-sm text-muted-foreground">Crear Tarea</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="border-t p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Search className="h-3 w-3" />
        <span>
          Usa <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd> para abrir búsqueda
        </span>
      </div>
    </CommandDialog>
  );
}