-- FASE 4: Schema de Planes y Tareas

-- Tabla de Planes de Acción
CREATE TABLE action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  diagnosis_id UUID REFERENCES diagnoses(id),
  version TEXT DEFAULT '1.0',
  title TEXT NOT NULL,
  description TEXT,
  time_horizon INTEGER, -- meses (3, 6, 12)
  complexity_level TEXT, -- 'basic', 'medium', 'advanced'
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Áreas del Plan
CREATE TABLE plan_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES action_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- 'Estrategia', 'Operaciones', 'Finanzas', etc.
  order_index INTEGER,
  description TEXT,
  target_score INTEGER -- Score objetivo para esta área
);

-- Tabla de Objetivos por Área
CREATE TABLE plan_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES plan_areas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT, -- 'high', 'medium', 'low'
  order_index INTEGER
);

-- Tabla de Tareas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES plan_objectives(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  priority TEXT, -- 'high', 'medium', 'low'
  assigned_to UUID REFERENCES auth.users(id),
  depends_on UUID REFERENCES tasks(id), -- Dependencias entre tareas
  estimated_effort INTEGER, -- días
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de KPIs por Tarea
CREATE TABLE task_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT -- '%', '$', 'count', etc.
);

-- Índices para mejorar performance
CREATE INDEX idx_action_plans_company ON action_plans(company_id);
CREATE INDEX idx_action_plans_status ON action_plans(status);
CREATE INDEX idx_plan_areas_plan ON plan_areas(plan_id);
CREATE INDEX idx_plan_objectives_area ON plan_objectives(area_id);
CREATE INDEX idx_tasks_objective ON tasks(objective_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Trigger para updated_at en action_plans
CREATE TRIGGER update_action_plans_updated_at
  BEFORE UPDATE ON action_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ RLS POLICIES ============

-- action_plans
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view plans from their company"
  ON action_plans FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create plans for their company"
  ON action_plans FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update plans from their company"
  ON action_plans FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all plans"
  ON action_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- plan_areas
ALTER TABLE plan_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view areas from their company plans"
  ON plan_areas FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM action_plans
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create areas for their company plans"
  ON plan_areas FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT id FROM action_plans
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update areas from their company plans"
  ON plan_areas FOR UPDATE
  USING (
    plan_id IN (
      SELECT id FROM action_plans
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all areas"
  ON plan_areas FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- plan_objectives
ALTER TABLE plan_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view objectives from their company"
  ON plan_objectives FOR SELECT
  USING (
    area_id IN (
      SELECT pa.id FROM plan_areas pa
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create objectives for their company"
  ON plan_objectives FOR INSERT
  WITH CHECK (
    area_id IN (
      SELECT pa.id FROM plan_areas pa
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update objectives from their company"
  ON plan_objectives FOR UPDATE
  USING (
    area_id IN (
      SELECT pa.id FROM plan_areas pa
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all objectives"
  ON plan_objectives FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks from their company"
  ON tasks FOR SELECT
  USING (
    objective_id IN (
      SELECT po.id FROM plan_objectives po
      JOIN plan_areas pa ON pa.id = po.area_id
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create tasks for their company"
  ON tasks FOR INSERT
  WITH CHECK (
    objective_id IN (
      SELECT po.id FROM plan_objectives po
      JOIN plan_areas pa ON pa.id = po.area_id
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update tasks from their company"
  ON tasks FOR UPDATE
  USING (
    objective_id IN (
      SELECT po.id FROM plan_objectives po
      JOIN plan_areas pa ON pa.id = po.area_id
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all tasks"
  ON tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- task_kpis
ALTER TABLE task_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KPIs from their company tasks"
  ON task_kpis FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN plan_objectives po ON po.id = t.objective_id
      JOIN plan_areas pa ON pa.id = po.area_id
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create KPIs for their company tasks"
  ON task_kpis FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN plan_objectives po ON po.id = t.objective_id
      JOIN plan_areas pa ON pa.id = po.area_id
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update KPIs from their company tasks"
  ON task_kpis FOR UPDATE
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN plan_objectives po ON po.id = t.objective_id
      JOIN plan_areas pa ON pa.id = po.area_id
      JOIN action_plans ap ON ap.id = pa.plan_id
      WHERE ap.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all KPIs"
  ON task_kpis FOR ALL
  USING (has_role(auth.uid(), 'admin'));