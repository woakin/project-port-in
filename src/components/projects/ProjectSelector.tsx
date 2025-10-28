import { useState } from 'react';
import { Check, ChevronDown, FolderOpen, Plus, Grid3x3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useProjectContext } from '@/contexts/ProjectContext';
import { CreateProjectDialog } from './CreateProjectDialog';

export function ProjectSelector() {
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject, loading } = useProjectContext();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (loading || !currentProject) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 animate-pulse">
        <FolderOpen className="h-4 w-4" />
        <span className="text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="max-w-[150px] truncate">{currentProject.name}</span>
            {currentProject.status !== 'active' && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {currentProject.status === 'archived' ? 'Archivado' : 'Completado'}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-medium">{project.name}</span>
                {project.description && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {project.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {project.status !== 'active' && (
                  <Badge variant="secondary" className="text-xs">
                    {project.status === 'archived' ? 'Archivado' : 'Completado'}
                  </Badge>
                )}
                {currentProject.id === project.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate('/projects')}
            className="cursor-pointer"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Ver Todos los Proyectos
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo Proyecto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
