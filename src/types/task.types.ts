export interface Task {
  id: string;
  objective_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  assigned_to: string | null;
  depends_on: string | null;
  estimated_effort: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface TaskKPI {
  id: string;
  task_id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
}
