-- Create KPIs table for company-level metrics
CREATE TABLE public.kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  area TEXT NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  target_value NUMERIC,
  unit TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- Create policies for KPIs
CREATE POLICY "Users can view KPIs from their company"
ON public.kpis
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create KPIs for their company"
ON public.kpis
FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update KPIs from their company"
ON public.kpis
FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage all KPIs"
ON public.kpis
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create KPI alerts table
CREATE TABLE public.kpi_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL,
  user_id UUID NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'equal')),
  threshold NUMERIC NOT NULL,
  notification_channel TEXT NOT NULL CHECK (notification_channel IN ('email', 'in_app', 'slack')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpi_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for KPI alerts
CREATE POLICY "Users can view their own alerts"
ON public.kpi_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
ON public.kpi_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.kpi_alerts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.kpi_alerts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all alerts"
ON public.kpi_alerts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_kpis_company_id ON public.kpis(company_id);
CREATE INDEX idx_kpis_area ON public.kpis(area);
CREATE INDEX idx_kpi_alerts_kpi_id ON public.kpi_alerts(kpi_id);
CREATE INDEX idx_kpi_alerts_user_id ON public.kpi_alerts(user_id);