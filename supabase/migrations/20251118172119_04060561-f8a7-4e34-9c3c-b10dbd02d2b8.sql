-- Arreglar el trigger para usar las variables de entorno correctas
CREATE OR REPLACE FUNCTION check_kpi_alerts_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT := 'https://ragxwkdediazundeclwb.supabase.co';
  service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ3h3a2RlZGlhenVuZGVjbHdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4ODQ0OCwiZXhwIjoyMDc3MTY0NDQ4fQ.ktJdT-3OiYJZfPETzqFHqZOLhKPW3GS9gKHiIywcyI4';
BEGIN
  -- Invocar edge function de manera asíncrona usando pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/check-kpi-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'trigger', 'kpi_update',
      'company_id', NEW.company_id,
      'kpi_name', NEW.name
    )
  );
  
  RETURN NEW;
END;
$$;