import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KPI } from '@/types/kpi.types';
import { useAuth } from './useAuth';

export function useKPIs() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchKPIs = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchKPIs();

    // Set up Realtime listener for automatic updates
    const channel = supabase
      .channel('kpis-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'kpis'
        },
        (payload) => {
          console.log('KPI realtime change detected:', payload);
          fetchKPIs(); // Automatically refresh
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchKPIs]);

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
    const belowTarget = latest.filter(kpi => {
      if (!kpi.target_value) return false;
      return kpi.value < kpi.target_value;
    }).length;

    return { total, onTarget, belowTarget };
  };

  const getKPIHistory = (name: string) => {
    return kpis
      .filter(kpi => kpi.name === name)
      .sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime());
  };

  const getUniqueKPINames = () => {
    const names = new Set(kpis.map(kpi => kpi.name));
    return Array.from(names).sort();
  };

  const getKPITrend = (name: string) => {
    const history = getKPIHistory(name);
    if (history.length < 2) return 'stable';
    
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    if (latest.value > previous.value) return 'up';
    if (latest.value < previous.value) return 'down';
    return 'stable';
  };

  const markAsMainKPI = async (id: string) => {
    try {
      // First, unmark all KPIs
      const { error: unmarkError } = await supabase
        .from('kpis')
        .update({ is_main_kpi: false })
        .neq('id', id);

      if (unmarkError) throw unmarkError;

      // Then mark the selected one
      const { error: markError } = await supabase
        .from('kpis')
        .update({ is_main_kpi: true })
        .eq('id', id);

      if (markError) throw markError;
      
      await fetchKPIs();
    } catch (error) {
      console.error('Error marking main KPI:', error);
      throw error;
    }
  };

  const getMainKPI = () => {
    return kpis.find(kpi => kpi.is_main_kpi);
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
    getKPIHistory,
    getUniqueKPINames,
    getKPITrend,
    markAsMainKPI,
    getMainKPI,
    addKPI,
    refetch: fetchKPIs
  };
}
