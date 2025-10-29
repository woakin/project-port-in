-- Add is_main_kpi field to kpis table
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS is_main_kpi BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_kpis_is_main_kpi ON kpis(is_main_kpi) WHERE is_main_kpi = true;

-- Comment for clarity
COMMENT ON COLUMN kpis.is_main_kpi IS 'Indicates if this KPI should be featured on the main dashboard';