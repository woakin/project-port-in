-- Add created_by column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

-- Create new policies that work correctly
CREATE POLICY "Users can insert their own companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view companies they created or are associated with"
ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by 
  OR 
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

CREATE POLICY "Users can update companies they created or are associated with"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  OR 
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND company_id IS NOT NULL
  )
)
WITH CHECK (
  auth.uid() = created_by 
  OR 
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

CREATE POLICY "Admins can manage all companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Update existing companies to set created_by (for existing data)
UPDATE public.companies 
SET created_by = (
  SELECT id 
  FROM public.profiles 
  WHERE company_id = companies.id 
  LIMIT 1
)
WHERE created_by IS NULL;