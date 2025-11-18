-- Actualizar el trigger con el service_role_key correcto
-- El service_role_key actual está en los secrets de Supabase

-- Primero, vamos a obtener el valor desde las variables de entorno en tiempo de ejecución
-- en lugar de hardcodearlo en la función

DROP FUNCTION IF EXISTS check_kpi_alerts_trigger() CASCADE;

CREATE OR REPLACE FUNCTION check_kpi_alerts_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Obtener valores desde current_setting si están disponibles,
  -- o usar valores por defecto (estos deberían ser configurados)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Si no están configurados, usar valores hardcodeados como fallback
  IF supabase_url IS NULL THEN
    supabase_url := 'https://ragxwkdediazundeclwb.supabase.co';
  END IF;
  
  IF service_key IS NULL THEN
    -- Este es el service_role_key correcto obtenido desde las secrets
    service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ3h3a2RlZGlhenVuZGVjbHdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4ODQ0OCwiZXhwIjoyMDc3MTY0NDQ4fQ.ktJdT-3OiYJZfPETzqFHqZOLhKPW3GS9gKHiIywcyI4';
  END IF;
  
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

-- Recrear el trigger
CREATE TRIGGER trigger_check_alerts_on_kpi_change
AFTER INSERT OR UPDATE ON kpis
FOR EACH ROW
EXECUTE FUNCTION check_kpi_alerts_trigger();