-- Fix maturity_level check constraint to match edge function validation
-- The edge function uses: 'idea', 'startup', 'pyme', 'corporate'

-- Drop the old constraint
ALTER TABLE public.diagnoses DROP CONSTRAINT IF EXISTS diagnoses_maturity_level_check;

-- Add the correct constraint
ALTER TABLE public.diagnoses ADD CONSTRAINT diagnoses_maturity_level_check 
CHECK (maturity_level IN ('idea', 'startup', 'pyme', 'corporate'));