import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';

interface DashboardStats {
  activeTasks: number;
  completedTasks: number;
  totalSpent: number;
  activeDoers: number;
}

interface RecentTask {
  id: string;
  title: string;
  category: string;
  status: string;
  budget: number;
  applicantCount: number;
  created_at: string;
}

export const useDashboardData = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    activeTasks: 0,
    completedTasks: 0,
    totalSpent: 0,
    activeDoers: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's tasks for stats
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, budget, title, category, created_at')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Calculate stats
      const activeTasks = tasks?.filter(task => 
        task.status === 'open' || task.status === 'assigned' || task.status === 'in_progress'
      ).length || 0;
      
      const completedTasks = tasks?.filter(task => 
        task.status === 'completed'
      ).length || 0;

      // Fetch total spent from payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('client_id', user.id)
        .eq('payment_status', 'completed');

      if (paymentsError) throw paymentsError;

      const totalSpent = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      // Fetch active doers count
      const { data: activeDoersData, error: doersError } = await supabase
        .from('tasks')
        .select('doer_id')
        .eq('client_id', user.id)
        .not('doer_id', 'is', null)
        .in('status', ['assigned', 'in_progress']);

      if (doersError) throw doersError;

      const uniqueDoers = new Set(activeDoersData?.map(task => task.doer_id)).size;

      setStats({
        activeTasks,
        completedTasks,
        totalSpent,
        activeDoers: uniqueDoers,
      });

      // Fetch recent tasks with application counts
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.slice(0, 5).map(task => task.id);
        
        const { data: applications, error: applicationsError } = await supabase
          .from('task_applications')
          .select('task_id')
          .in('task_id', taskIds);

        if (applicationsError) throw applicationsError;

        const applicationCounts = applications?.reduce((acc, app) => {
          acc[app.task_id] = (acc[app.task_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const recentTasksWithCounts = tasks.slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          category: task.category,
          status: task.status,
          budget: task.budget,
          applicantCount: applicationCounts[task.id] || 0,
          created_at: task.created_at,
        }));

        setRecentTasks(recentTasksWithCounts);
      } else {
        setRecentTasks([]);
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  return {
    stats,
    recentTasks,
    isLoading,
    error,
    refresh: fetchDashboardData,
  };
};