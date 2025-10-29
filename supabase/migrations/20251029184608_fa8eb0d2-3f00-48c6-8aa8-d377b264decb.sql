-- Add DELETE policy for KPIs table
-- Allow users to delete KPIs from their company
CREATE POLICY "Users can delete KPIs from their company"
ON public.kpis
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);