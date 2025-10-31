-- Fix search_path for functions that don't have it set
-- This prevents potential SQL injection through search_path manipulation

-- Update update_updated_at_column function to have immutable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update handle_new_user function to have immutable search_path  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Asignar rol por defecto (team_member)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member');
  
  RETURN NEW;
END;
$function$;