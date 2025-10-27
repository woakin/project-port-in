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

export interface Task {
  id: string;
  objective_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low' | null;
  assigned_to: string | null;
  depends_on: string | null;
  estimated_effort: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface TaskKPI {
  id: string;
  task_id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
}

// Types para el payload de generación de plan
export interface GeneratePlanRequest {
  diagnosisId: string;
  timeHorizon: 3 | 6 | 12;
  complexityLevel: 'basic' | 'medium' | 'advanced';
}

export interface GeneratedPlanArea {
  name: string;
  description: string;
  target_score?: number;
  objectives: GeneratedObjective[];
}

export interface GeneratedObjective {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actions: GeneratedAction[];
}

export interface GeneratedAction {
  title: string;
  description: string;
  estimated_effort: number;
  kpis?: GeneratedKPI[];
}

export interface GeneratedKPI {
  name: string;
  target: number;
  unit: string;
}
