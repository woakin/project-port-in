-- Fix RLS policies for companies table to allow authenticated users to create and manage companies

-- Allow authenticated users to insert companies
CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view companies they created or are associated with
CREATE POLICY "Users can view their companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update companies they're associated with
CREATE POLICY "Users can update their companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);