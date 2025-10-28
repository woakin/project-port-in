-- Actualizar política de RLS para permitir ver diagnósticos de la misma empresa
DROP POLICY IF EXISTS "Users can view own diagnoses" ON diagnoses;

CREATE POLICY "Users can view company diagnoses"
ON diagnoses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company_id = diagnoses.company_id
  )
);