-- Insertar configuraciones para los prompts de cada modo del chat
INSERT INTO system_config (key, description, value)
VALUES 
  ('chat_strategic_system_prompt', 'System prompt para modo de consulta estratégica', '{"prompt": ""}'),
  ('chat_follow_up_system_prompt', 'System prompt para modo de seguimiento de planes', '{"prompt": ""}'),
  ('chat_document_system_prompt', 'System prompt para modo de análisis de documentos', '{"prompt": ""}')
ON CONFLICT (key) DO NOTHING;