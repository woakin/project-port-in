import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project } from '@/types/project.types';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  setCurrentProject: (project: Project) => void;
  createProject: (name: string, description: string, companyId: string) => Promise<any>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<boolean>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const projectHook = useProject();
  const [providerLoading, setProviderLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      // When user changes, resolve company_id and load projects
      if (!user) {
        setProviderLoading(false);
        return;
      }
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id) {
          await projectHook.fetchProjects(profile.company_id);
        }
      } catch (e) {
        console.error('Error initializing projects:', e);
      } finally {
        if (!cancelled) setProviderLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  const refreshProjects = async () => {
    if (!user) return;
    setProviderLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        await projectHook.fetchProjects(profile.company_id);
      }
    } catch (e) {
      console.error('Error refreshing projects:', e);
    } finally {
      setProviderLoading(false);
    }
  };

  return (
    <ProjectContext.Provider value={{ ...projectHook, loading: providerLoading, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
