-- FASE 1: Migración de arquitectura de alertas (kpi_id -> kpi_name + company_id)

-- Paso 1: Agregar columnas kpi_name y company_id
ALTER TABLE kpi_alerts ADD COLUMN IF NOT EXISTS kpi_name TEXT;
ALTER TABLE kpi_alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Paso 2: Poblar kpi_name y company_id desde kpis existentes
UPDATE kpi_alerts ka
SET 
  kpi_name = k.name,
  company_id = k.company_id
FROM kpis k
WHERE ka.kpi_id = k.id AND ka.kpi_name IS NULL;

-- Paso 3: Hacer kpi_name y company_id NOT NULL
ALTER TABLE kpi_alerts ALTER COLUMN kpi_name SET NOT NULL;
ALTER TABLE kpi_alerts ALTER COLUMN company_id SET NOT NULL;

-- Paso 4: Hacer kpi_id opcional (por compatibilidad temporal)
ALTER TABLE kpi_alerts ALTER COLUMN kpi_id DROP NOT NULL;

-- Paso 5: Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_name_company ON kpi_alerts(kpi_name, company_id);

-- Paso 6: Actualizar RLS policies
DROP POLICY IF EXISTS "Users can view their own alerts" ON kpi_alerts;
DROP POLICY IF EXISTS "Users can create their own alerts" ON kpi_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON kpi_alerts;
DROP POLICY IF EXISTS "Users can delete their own alerts" ON kpi_alerts;

CREATE POLICY "Users can view alerts from their company"
ON kpi_alerts FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create alerts for their company"
ON kpi_alerts FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) AND auth.uid() = user_id
);

CREATE POLICY "Users can update alerts from their company"
ON kpi_alerts FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) AND auth.uid() = user_id
);

CREATE POLICY "Users can delete alerts from their company"
ON kpi_alerts FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) AND auth.uid() = user_id
);

-- Paso 7: Habilitar Realtime en la tabla notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Paso 8: Crear función para invocar check-kpi-alerts desde trigger
CREATE OR REPLACE FUNCTION check_kpi_alerts_trigger()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 9: Crear trigger en la tabla kpis
DROP TRIGGER IF EXISTS trigger_check_alerts_on_kpi_change ON kpis;
CREATE TRIGGER trigger_check_alerts_on_kpi_change
AFTER INSERT OR UPDATE ON kpis
FOR EACH ROW
EXECUTE FUNCTION check_kpi_alerts_trigger();