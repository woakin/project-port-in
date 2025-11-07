import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

type User = {
  id: string;
  email?: string;
};

export async function ensureProjectExists(
  supabase: SupabaseClient<Database>,
  user: User,
  companyData: {
    name: string;
    industry: string;
    size: string;
  },
  projectData: {
    name: string;
    description?: string;
  }
): Promise<{ company_id: string; project_id: string; project: any }> {
  
  // 1. Verificar empresa existente
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  let companyId = profile?.company_id;

  // 2. Crear empresa si no existe
  if (!companyId) {
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        name: companyData.name,
        industry: companyData.industry,
        size: companyData.size,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    companyId = newCompany.id;

    await supabase
      .from('profiles')
      .update({ company_id: companyId })
      .eq('id', user.id);
  }

  // 3. Crear proyecto
  const { data: newProject, error: projectError } = await supabase
    .from('projects')
    .insert({
      company_id: companyId,
      name: projectData.name,
      description: projectData.description || null,
      status: 'active'
    })
    .select()
    .single();

  if (projectError) throw projectError;

  return {
    company_id: companyId,
    project_id: newProject.id,
    project: newProject
  };
}
