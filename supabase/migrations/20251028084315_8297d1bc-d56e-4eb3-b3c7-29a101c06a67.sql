-- Crear tabla de documentos
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'docx', 'xlsx', 'txt', 'csv'
  file_size INTEGER,
  category TEXT, -- 'financial', 'legal', 'operational', 'marketing', 'strategic', 'other'
  analysis_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  analysis_result JSONB, -- Resultado del análisis LLM
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear bucket de almacenamiento para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Enable RLS en documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies para documents
-- Los usuarios pueden ver documentos de su empresa
CREATE POLICY "Users can view documents from their company"
ON documents FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Los usuarios pueden subir documentos a su empresa
CREATE POLICY "Users can upload documents for their company"
ON documents FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

-- Los usuarios pueden actualizar documentos de su empresa
CREATE POLICY "Users can update documents from their company"
ON documents FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Los usuarios pueden eliminar documentos de su empresa
CREATE POLICY "Users can delete documents from their company"
ON documents FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Admins pueden gestionar todos los documentos
CREATE POLICY "Admins can manage all documents"
ON documents FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para storage.objects (bucket documents)
-- Los usuarios pueden ver archivos de su empresa
CREATE POLICY "Users can view their company documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Los usuarios pueden subir archivos a su empresa
CREATE POLICY "Users can upload documents to their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Los usuarios pueden eliminar archivos de su empresa
CREATE POLICY "Users can delete their company documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();