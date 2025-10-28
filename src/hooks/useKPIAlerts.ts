import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KPIAlert } from '@/types/kpi.types';
import { useAuth } from './useAuth';

export function useKPIAlerts() {
  const [alerts, setAlerts] = useState<KPIAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kpi_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as KPIAlert[]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async (alert: Omit<KPIAlert, 'id' | 'created_at' | 'last_triggered_at'>) => {
    try {
      const { error } = await supabase
        .from('kpi_alerts')
        .insert({
          ...alert,
          user_id: user?.id,
        });

      if (error) throw error;
      await fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  };

  const updateAlert = async (id: string, updates: Partial<KPIAlert>) => {
    try {
      const { error } = await supabase
        .from('kpi_alerts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('kpi_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  };

  const getActiveAlerts = () => {
    return alerts.filter(alert => alert.is_active);
  };

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    deleteAlert,
    getActiveAlerts,
    refetch: fetchAlerts,
  };
}
