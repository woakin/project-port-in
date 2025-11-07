-- Add DELETE policy for projects table
CREATE POLICY "Users can delete projects from their company"
ON public.projects
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);