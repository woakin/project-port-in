import React, { createContext, useContext, useEffect } from 'react';
import { Project } from '@/types/project.types';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/hooks/useAuth';

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

  useEffect(() => {
    if (user?.user_metadata?.company_id) {
      projectHook.fetchProjects(user.user_metadata.company_id);
    }
  }, [user?.user_metadata?.company_id]);

  const refreshProjects = async () => {
    if (user?.user_metadata?.company_id) {
      await projectHook.fetchProjects(user.user_metadata.company_id);
    }
  };

  return (
    <ProjectContext.Provider value={{ ...projectHook, refreshProjects }}>
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
