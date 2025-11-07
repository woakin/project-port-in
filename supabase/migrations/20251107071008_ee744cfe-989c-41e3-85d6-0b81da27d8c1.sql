-- Actualizar todos los planes en draft a active para que las tareas sean visibles
UPDATE action_plans 
SET status = 'active' 
WHERE status = 'draft';