-- Habilitar extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar cron job para ejecutar check-kpi-alerts cada hora
SELECT cron.schedule(
  'check-kpi-alerts-hourly',
  '0 * * * *', -- Cada hora en punto (minuto 0)
  $$
  SELECT net.http_post(
    url := 'https://ragxwkdediazundeclwb.supabase.co/functions/v1/check-kpi-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ3h3a2RlZGlhenVuZGVjbHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODg0NDgsImV4cCI6MjA3NzE2NDQ0OH0.uzQLCTHRJoO47fVdDRM8AVnrQu6_TklkQopqF5N5IsU"}'::jsonb,
    body := jsonb_build_object('time', now()::text)
  ) AS request_id;
  $$
);

-- Verificar que el cron job fue creado correctamente
SELECT * FROM cron.job WHERE jobname = 'check-kpi-alerts-hourly';