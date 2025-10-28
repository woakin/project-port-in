-- Tabla de comentarios en tareas (FR-004.5)
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de adjuntos en tareas (FR-004.5)
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments from their company tasks"
ON task_comments FOR SELECT
USING (
  task_id IN (
    SELECT t.id FROM tasks t
    JOIN plan_objectives po ON t.objective_id = po.id
    JOIN plan_areas pa ON po.area_id = pa.id
    JOIN action_plans ap ON pa.plan_id = ap.id
    WHERE ap.company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create comments on their company tasks"
ON task_comments FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id FROM tasks t
    JOIN plan_objectives po ON t.objective_id = po.id
    JOIN plan_areas pa ON po.area_id = pa.id
    JOIN action_plans ap ON pa.plan_id = ap.id
    WHERE ap.company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  AND auth.uid() = user_id
);

-- RLS para task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments from their company tasks"
ON task_attachments FOR SELECT
USING (
  task_id IN (
    SELECT t.id FROM tasks t
    JOIN plan_objectives po ON t.objective_id = po.id
    JOIN plan_areas pa ON po.area_id = pa.id
    JOIN action_plans ap ON pa.plan_id = ap.id
    WHERE ap.company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload attachments to their company tasks"
ON task_attachments FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id FROM tasks t
    JOIN plan_objectives po ON t.objective_id = po.id
    JOIN plan_areas pa ON po.area_id = pa.id
    JOIN action_plans ap ON pa.plan_id = ap.id
    WHERE ap.company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  AND auth.uid() = uploaded_by
);

-- Función para calcular progreso de un plan (FR-004.6)
CREATE OR REPLACE FUNCTION calculate_plan_progress(plan_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_by_area JSONB;
  overall_progress NUMERIC;
BEGIN
  -- Total tasks
  SELECT COUNT(*) INTO total_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid;

  -- Completed tasks
  SELECT COUNT(*) INTO completed_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid AND t.status = 'completed';

  -- Progress by area
  SELECT jsonb_object_agg(pa.name, area_data) INTO progress_by_area
  FROM (
    SELECT 
      pa.name,
      jsonb_build_object(
        'total', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE t.status = 'completed'),
        'progress', CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE t.status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100)
          ELSE 0
        END
      ) as area_data
    FROM plan_areas pa
    JOIN plan_objectives po ON po.area_id = pa.id
    JOIN tasks t ON t.objective_id = po.id
    WHERE pa.plan_id = plan_uuid
    GROUP BY pa.name
  ) sub;

  -- Overall progress
  IF total_tasks > 0 THEN
    overall_progress := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    overall_progress := 0;
  END IF;

  RETURN jsonb_build_object(
    'total_tasks', total_tasks,
    'completed_tasks', completed_tasks,
    'overall_progress', overall_progress,
    'by_area', progress_by_area
  );
END;
$$;