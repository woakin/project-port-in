import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KPI } from '@/types/kpi.types';
import { useAuth } from './useAuth';

export function useKPIs() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchKPIs();
  }, [user]);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      // Get latest KPIs
      const { data: kpisData, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKpis((kpisData || []) as KPI[]);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKPIsByArea = (area: string) => {
    return kpis.filter(kpi => kpi.area === area);
  };

  const getLatestKPIs = () => {
    // Get the most recent KPI for each unique name
    const uniqueKPIs = new Map<string, KPI>();
    
    kpis.forEach(kpi => {
      const existing = uniqueKPIs.get(kpi.name);
      if (!existing || new Date(kpi.created_at) > new Date(existing.created_at)) {
        uniqueKPIs.set(kpi.name, kpi);
      }
    });

    return Array.from(uniqueKPIs.values());
  };

  const getKPIStats = () => {
    const latest = getLatestKPIs();
    const total = latest.length;
    const onTarget = latest.filter(kpi => {
      if (!kpi.target_value) return false;
      return kpi.value >= kpi.target_value;
    }).length;
    const belowTarget = total - onTarget;

    return { total, onTarget, belowTarget };
  };

  const addKPI = async (kpi: Omit<KPI, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('kpis')
        .insert(kpi);

      if (error) throw error;
      await fetchKPIs();
    } catch (error) {
      console.error('Error adding KPI:', error);
      throw error;
    }
  };

  return {
    kpis,
    loading,
    getKPIsByArea,
    getLatestKPIs,
    getKPIStats,
    addKPI,
    refetch: fetchKPIs
  };
}
