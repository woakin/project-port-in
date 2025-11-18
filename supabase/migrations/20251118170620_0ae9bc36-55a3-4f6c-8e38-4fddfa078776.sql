-- Arreglar warning de seguridad: agregar search_path a la función
CREATE OR REPLACE FUNCTION check_kpi_alerts_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT := current_setting('app.settings.supabase_url', true);
  service_key TEXT := current_setting('app.settings.service_role_key', true);
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