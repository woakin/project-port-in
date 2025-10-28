import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActionPlan, GeneratePlanRequest } from '@/types/plan.types';
import { useToast } from '@/hooks/use-toast';

export function usePlan() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePlan = async (request: GeneratePlanRequest): Promise<ActionPlan | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-action-plan', {
        body: request
      });

      if (error) {
        throw error;
      }

    if (!data?.success || !data?.planId) {
      throw new Error('Error al generar el plan');
    }

    toast({
      title: 'Plan generado',
      description: 'Tu plan de acción ha sido creado exitosamente'
    });

    // Devolver el objeto plan con el ID del planId
    return { ...data.plan, id: data.planId };
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al generar el plan',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchPlan = async (planId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('action_plans')
        .select(`
          *,
          plan_areas (
            *,
            plan_objectives (
              *,
              tasks (
                *,
                task_kpis (*)
              )
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching plan:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el plan',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyPlans = async (companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('action_plans')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching company plans:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    generatePlan,
    fetchPlan,
    fetchCompanyPlans
  };
}
