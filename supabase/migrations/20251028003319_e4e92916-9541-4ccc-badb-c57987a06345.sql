-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  is_default BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects from their company"
  ON public.projects FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create projects for their company"
  ON public.projects FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update projects from their company"
  ON public.projects FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage all projects"
  ON public.projects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add project_id to diagnoses
ALTER TABLE public.diagnoses ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to action_plans
ALTER TABLE public.action_plans ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create default projects for existing companies and migrate data
INSERT INTO public.projects (company_id, name, description, is_default, status)
SELECT 
  id as company_id,
  'Proyecto Principal' as name,
  'Proyecto por defecto para diagnósticos y planes existentes' as description,
  true as is_default,
  'active' as status
FROM public.companies
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects WHERE projects.company_id = companies.id
);

-- Migrate existing diagnoses to default project
UPDATE public.diagnoses d
SET project_id = (
  SELECT p.id 
  FROM public.projects p 
  WHERE p.company_id = d.company_id 
    AND p.is_default = true
  LIMIT 1
)
WHERE project_id IS NULL;

-- Migrate existing action_plans to default project
UPDATE public.action_plans ap
SET project_id = (
  SELECT p.id 
  FROM public.projects p 
  WHERE p.company_id = ap.company_id 
    AND p.is_default = true
  LIMIT 1
)
WHERE project_id IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_diagnoses_project_id ON public.diagnoses(project_id);
CREATE INDEX idx_action_plans_project_id ON public.action_plans(project_id);