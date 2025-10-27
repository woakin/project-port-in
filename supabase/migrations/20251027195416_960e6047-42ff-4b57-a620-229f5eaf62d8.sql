-- Tabla de diagnósticos
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version INTEGER DEFAULT 1,
  -- Scores por área (0-100)
  strategy_score INTEGER CHECK (strategy_score >= 0 AND strategy_score <= 100),
  operations_score INTEGER CHECK (operations_score >= 0 AND operations_score <= 100),
  finance_score INTEGER CHECK (finance_score >= 0 AND finance_score <= 100),
  marketing_score INTEGER CHECK (marketing_score >= 0 AND marketing_score <= 100),
  legal_score INTEGER CHECK (legal_score >= 0 AND legal_score <= 100),
  technology_score INTEGER CHECK (technology_score >= 0 AND technology_score <= 100),
  -- Datos del formulario
  form_responses JSONB,
  maturity_level TEXT CHECK (maturity_level IN ('idea', 'startup', 'pyme', 'corporate')),
  insights JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

-- Policies para diagnoses
CREATE POLICY "Users can view own diagnoses"
ON diagnoses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own diagnoses"
ON diagnoses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnoses"
ON diagnoses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all diagnoses"
ON diagnoses FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_diagnoses_updated_at
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();