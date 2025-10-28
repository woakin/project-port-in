-- Actualizar constraint de maturity_level para usar valores más descriptivos
ALTER TABLE diagnoses 
DROP CONSTRAINT IF EXISTS diagnoses_maturity_level_check;

ALTER TABLE diagnoses 
ADD CONSTRAINT diagnoses_maturity_level_check 
CHECK (maturity_level IN ('emergente', 'en_desarrollo', 'maduro', 'optimizado'));