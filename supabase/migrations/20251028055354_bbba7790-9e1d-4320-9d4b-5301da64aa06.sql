-- Limpiar base de datos manteniendo usuarios
-- Eliminar en orden para respetar foreign keys

DELETE FROM task_kpis;
DELETE FROM tasks;
DELETE FROM plan_objectives;
DELETE FROM plan_areas;
DELETE FROM action_plans;
DELETE FROM diagnoses;
DELETE FROM kpis;
DELETE FROM projects;
DELETE FROM companies;