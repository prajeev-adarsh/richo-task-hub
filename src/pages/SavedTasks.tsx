import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Bookmark, MapPin, Calendar, IndianRupee, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useSavedTasks } from '@/hooks/useSavedTasks';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  is_remote: boolean;
  budget: number;
  deadline: string;
  status: string;
  created_at: string;
}

const SavedTasks = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { savedTaskIds, unsaveTask, loading: savedLoading } = useSavedTasks();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedTasks = async () => {
      if (!user?.id || savedLoading) return;

      const taskIdsArray = Array.from(savedTaskIds);
      if (taskIdsArray.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('id', taskIdsArray)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        logger.error('Error fetching saved tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedTasks();
  }, [user?.id, savedTaskIds, savedLoading]);

  const getDaysRemaining = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const handleUnsave = async (taskId: string) => {
    await unsaveTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  if (loading || savedLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <p className="text-muted-foreground">Loading saved tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="h-8 w-8 text-primary fill-primary" />
          <h1 className="text-3xl font-bold">Saved Tasks</h1>
          <Badge variant="secondary" className="ml-2">
            {tasks.length} saved
          </Badge>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No saved tasks</h3>
              <p className="text-muted-foreground mb-4">
                Browse tasks and click the bookmark icon to save them for later
              </p>
              <Button onClick={() => navigate('/browse-tasks')}>
                Browse Tasks
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => {
              const daysText = getDaysRemaining(task.deadline);
              const isUrgent = daysText === 'Due today' || daysText === 'Overdue' || daysText === '1 day left';
              const isExpired = task.status !== 'open';

              return (
                <Card key={task.id} className={`hover:shadow-lg transition-shadow group ${isExpired ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {task.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleUnsave(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {isExpired && (
                      <Badge variant="outline" className="w-fit">
                        No longer available
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {task.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600">₹{task.budget.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span>{task.is_remote ? 'Remote' : task.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span>{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                        <Badge 
                          variant={isUrgent ? "destructive" : "outline"} 
                          className="text-xs ml-auto"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {daysText}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/task/${task.id}`)}
                      >
                        View Details
                      </Button>
                      {!isExpired && (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/task/${task.id}`)}
                        >
                          Apply Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedTasks;
