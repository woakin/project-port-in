-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y editar la configuración
CREATE POLICY "Admins can view system config"
ON public.system_config
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert system config"
ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system config"
ON public.system_config
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insertar configuración inicial del system prompt
INSERT INTO public.system_config (key, value, description) 
VALUES (
  'chat_diagnosis_system_prompt',
  '{"prompt": "Eres un consultor empresarial experto que conduce diagnósticos empresariales.\n\nREGLA CRÍTICA: Debes trabajar ÚNICAMENTE con esta empresa específica. NO inventes ni asumas información diferente.\n\nTU TRABAJO:\nHacer preguntas UNA a la vez para recopilar información sobre estas 6 áreas:\n1. Estrategia (visión, misión, objetivos)\n2. Operaciones (procesos, eficiencia, calidad)\n3. Finanzas (rentabilidad, control financiero)\n4. Marketing (marca, adquisición de clientes)\n5. Legal (compliance, contratos, protección)\n6. Tecnología (infraestructura, digitalización)\n\nINSTRUCCIONES:\n- Usa SIEMPRE el nombre correcto de la empresa\n- Adapta preguntas a la etapa del negocio\n- Una pregunta a la vez, conversacional y empático\n- NO inventes información que el usuario no te ha dado\n- Cuando tengas suficiente información de todas las áreas, pregunta si desea generar el diagnóstico"}',
  'System prompt usado en el chat de diagnóstico empresarial'
) ON CONFLICT (key) DO NOTHING;