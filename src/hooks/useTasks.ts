import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task.types';
import { useAuth } from './useAuth';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      // Get tasks from active plans
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          plan_objectives!inner (
            plan_areas!inner (
              action_plans!inner (
                company_id,
                status
              )
            )
          )
        `)
        .eq('plan_objectives.plan_areas.action_plans.company_id', profile.company_id)
        .eq('plan_objectives.plan_areas.action_plans.status', 'active')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks((tasksData || []) as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    const upcoming = tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today;
    });
    return upcoming.slice(0, 5);
  };

  const getOverdueTasks = () => {
    const today = new Date();
    return tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const dueDate = new Date(task.due_date);
      return dueDate < today;
    });
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = getOverdueTasks().length;

    return { total, completed, inProgress, pending, overdue };
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  return {
    tasks,
    loading,
    getUpcomingTasks,
    getOverdueTasks,
    getTaskStats,
    updateTaskStatus,
    refetch: fetchTasks
  };
}
