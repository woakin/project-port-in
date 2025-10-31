-- Fix search_path for calculate_plan_progress function
-- This function is missing the search_path parameter

CREATE OR REPLACE FUNCTION public.calculate_plan_progress(plan_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  in_progress_tasks INTEGER;
  pending_tasks INTEGER;
  blocked_tasks INTEGER;
  progress_by_area JSONB;
  overall_progress NUMERIC;
BEGIN
  -- Total tasks
  SELECT COUNT(*) INTO total_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid;

  -- Return early if no tasks
  IF total_tasks = 0 THEN
    RETURN jsonb_build_object(
      'total_tasks', 0,
      'completed_tasks', 0,
      'in_progress_tasks', 0,
      'pending_tasks', 0,
      'blocked_tasks', 0,
      'overall_progress', 0,
      'by_area', '[]'::jsonb
    );
  END IF;

  -- Completed tasks
  SELECT COUNT(*) INTO completed_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid AND t.status = 'completed';

  -- In progress tasks
  SELECT COUNT(*) INTO in_progress_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid AND t.status = 'in_progress';

  -- Pending tasks
  SELECT COUNT(*) INTO pending_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid AND t.status = 'pending';

  -- Blocked tasks
  SELECT COUNT(*) INTO blocked_tasks
  FROM tasks t
  JOIN plan_objectives po ON t.objective_id = po.id
  JOIN plan_areas pa ON po.area_id = pa.id
  WHERE pa.plan_id = plan_uuid AND t.status = 'blocked';

  -- Calculate overall progress
  overall_progress := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100, 1);

  -- Progress by area
  SELECT jsonb_agg(
    jsonb_build_object(
      'area_id', area_id,
      'area_name', area_name,
      'total', total,
      'completed', completed,
      'in_progress', in_progress,
      'pending', pending,
      'blocked', blocked,
      'progress', CASE WHEN total > 0 THEN ROUND((completed::NUMERIC / total::NUMERIC) * 100, 1) ELSE 0 END
    )
  ) INTO progress_by_area
  FROM (
    SELECT 
      pa.id as area_id,
      pa.name as area_name,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
      COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE t.status = 'pending') as pending,
      COUNT(*) FILTER (WHERE t.status = 'blocked') as blocked
    FROM plan_areas pa
    JOIN plan_objectives po ON po.area_id = pa.id
    JOIN tasks t ON t.objective_id = po.id
    WHERE pa.plan_id = plan_uuid
    GROUP BY pa.id, pa.name, pa.order_index
    ORDER BY pa.order_index
  ) sub;

  RETURN jsonb_build_object(
    'total_tasks', total_tasks,
    'completed_tasks', completed_tasks,
    'in_progress_tasks', in_progress_tasks,
    'pending_tasks', pending_tasks,
    'blocked_tasks', blocked_tasks,
    'overall_progress', overall_progress,
    'by_area', COALESCE(progress_by_area, '[]'::jsonb)
  );
END;
$function$;