import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface SavedTask {
  id: string;
  task_id: string;
  created_at: string;
}

export const useSavedTasks = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [savedTaskIds, setSavedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSavedTasks = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_tasks')
        .select('task_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setSavedTaskIds(new Set(data?.map(s => s.task_id) || []));
    } catch (error) {
      logger.error('Error fetching saved tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSavedTasks();
  }, [fetchSavedTasks]);

  const saveTask = async (taskId: string) => {
    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save tasks",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('saved_tasks')
        .insert({ user_id: user.id, task_id: taskId });

      if (error) throw error;

      setSavedTaskIds(prev => new Set([...prev, taskId]));
      toast({
        title: "Task saved",
        description: "Task has been added to your saved list",
      });
      return true;
    } catch (error) {
      logger.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
      return false;
    }
  };

  const unsaveTask = async (taskId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('saved_tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('task_id', taskId);

      if (error) throw error;

      setSavedTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      toast({
        title: "Task removed",
        description: "Task has been removed from your saved list",
      });
      return true;
    } catch (error) {
      logger.error('Error unsaving task:', error);
      toast({
        title: "Error",
        description: "Failed to remove saved task",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleSaveTask = async (taskId: string) => {
    if (savedTaskIds.has(taskId)) {
      return unsaveTask(taskId);
    } else {
      return saveTask(taskId);
    }
  };

  const isTaskSaved = (taskId: string) => savedTaskIds.has(taskId);

  return {
    savedTaskIds,
    loading,
    saveTask,
    unsaveTask,
    toggleSaveTask,
    isTaskSaved,
    refetch: fetchSavedTasks,
  };
};
