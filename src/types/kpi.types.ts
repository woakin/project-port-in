export interface KPI {
  id: string;
  company_id: string;
  area: string;
  name: string;
  value: number;
  target_value: number | null;
  unit: string | null;
  period_start: string;
  period_end: string;
  source: string;
  metadata: Record<string, any> | null;
  created_at: string;
  is_main_kpi?: boolean;
}

export interface KPIAlert {
  id: string;
  kpi_id: string;
  user_id: string;
  condition: 'above' | 'below' | 'equal';
  threshold: number;
  notification_channel: 'email' | 'in_app' | 'slack';
  is_active: boolean;
  last_triggered_at: string | null;
}
