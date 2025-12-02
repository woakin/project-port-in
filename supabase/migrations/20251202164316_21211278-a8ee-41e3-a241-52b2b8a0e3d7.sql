-- Add chat_transcript column to store full diagnosis conversations
ALTER TABLE diagnoses 
ADD COLUMN IF NOT EXISTS chat_transcript JSONB DEFAULT NULL;

COMMENT ON COLUMN diagnoses.chat_transcript IS 'Transcripción completa del chat de diagnóstico incluyendo mensajes, áreas cubiertas y metadatos de sesión';