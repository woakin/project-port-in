export interface ActionPlan {
  id: string;
  company_id: string;
  diagnosis_id: string | null;
  version: string;
  title: string;
  description: string | null;
  time_horizon: number | null;
  complexity_level: 'basic' | 'medium' | 'advanced';
  status: 'draft' | 'active' | 'completed' | 'archived';
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PlanArea {
  id: string;
  plan_id: string;
  name: string;
  order_index: number | null;
  description: string | null;
  target_score: number | null;
}

export interface PlanObjective {
  id: string;
  area_id: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  order_index: number | null;
}
