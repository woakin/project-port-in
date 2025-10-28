-- Agregar política adicional para ver diagnósticos propios como fallback
CREATE POLICY "Users can view own diagnoses"
ON diagnoses
FOR SELECT
USING (auth.uid() = user_id);