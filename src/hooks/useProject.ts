import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project.types';
import { useToast } from '@/hooks/use-toast';

const CURRENT_PROJECT_KEY = 'current_project_id';

export function useProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjects = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as Project[]);
      
      // Set current project from localStorage or default
      const savedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
      if (savedProjectId && data) {
        const saved = data.find(p => p.id === savedProjectId);
        if (saved) {
          setCurrentProjectState(saved as Project);
          return;
        }
      }
      
      // Otherwise use default or first project
      const defaultProject = data?.find(p => p.is_default) || data?.[0];
      if (defaultProject) {
        setCurrentProjectState(defaultProject as Project);
        localStorage.setItem(CURRENT_PROJECT_KEY, defaultProject.id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los proyectos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
  };

  const createProject = async (name: string, description: string, companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          company_id: companyId,
          name,
          description,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Proyecto creado',
        description: `El proyecto "${name}" ha sido creado exitosamente`
      });

      // Refresh projects list
      await fetchProjects(companyId);
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el proyecto',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Proyecto actualizado',
        description: 'Los cambios han sido guardados'
      });

      // Refresh current project if it was updated
      if (currentProject?.id === projectId) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
        .single();
        
        if (data) {
          setCurrentProjectState(data as Project);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proyecto',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteProject = async (projectId: string, companyId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Proyecto eliminado',
        description: 'El proyecto ha sido eliminado exitosamente'
      });

      // If we deleted the current project, clear it
      if (currentProject?.id === projectId) {
        setCurrentProjectState(null);
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      }

      // Refresh projects list
      await fetchProjects(companyId);
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el proyecto',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    projects,
    currentProject,
    loading,
    fetchProjects,
    setCurrentProject,
    createProject,
    updateProject,
    deleteProject
  };
}
