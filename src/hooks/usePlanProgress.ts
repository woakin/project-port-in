import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AreaProgress {
  area_id: string;
  area_name: string;
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  blocked: number;
  progress: number;
}

export interface PlanProgress {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  blocked_tasks: number;
  overall_progress: number;
  by_area: AreaProgress[];
}

export function usePlanProgress(planId: string | undefined) {
  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planId) {
      fetchProgress();
    }
  }, [planId]);

  const fetchProgress = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_plan_progress', {
        plan_uuid: planId
      });

      if (error) throw error;
      
      // Parse the JSONB response
      if (data) {
        setProgress(data as unknown as PlanProgress);
      }
    } catch (error) {
      console.error('Error fetching plan progress:', error);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return { progress, loading, refetch: fetchProgress };
}
