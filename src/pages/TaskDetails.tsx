import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Calendar, IndianRupee, User, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  proof_required: boolean;
  created_at: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  doer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
}

const TaskDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [task, setTask] = useState<Task | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTaskDetails();
    }
  }, [id, user]);

  const fetchTaskDetails = async () => {
    if (!id) return;

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          client:users!tasks_client_id_fkey(id, name, email),
          doer:users!tasks_doer_id_fkey(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Check if user has already applied
      if (user && user.role === 'doer') {
        const { data: appData } = await supabase
          .from('task_applications')
          .select('*')
          .eq('task_id', id)
          .eq('doer_id', user.id)
          .single();
        
        setApplication(appData);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast({
        title: "Error",
        description: "Failed to load task details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user || !task) return;

    setApplying(true);
    try {
      const { error } = await supabase
        .from('task_applications')
        .insert({
          task_id: task.id,
          doer_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "✅ Application submitted!",
        description: "The client will review your application",
      });

      fetchTaskDetails();
    } catch (error) {
      console.error('Error applying:', error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/10 text-green-600';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600';
      case 'completed': return 'bg-gray-500/10 text-gray-600';
      case 'cancelled': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Task not found</p>
          <Button onClick={() => navigate('/browse-tasks')}>
            Back to Browse Tasks
          </Button>
        </div>
      </div>
    );
  }

  const canApply = user?.role === 'doer' && task.status === 'open' && !application;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{task.title}</CardTitle>
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ₹{task.budget.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Budget</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground capitalize">{task.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {task.is_remote ? 'Remote' : task.location}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(task.deadline), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Posted by</p>
                  <p className="text-sm text-muted-foreground">{task.client.name}</p>
                </div>
              </div>
            </div>

            {task.proof_required && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Proof of completion required</span>
                </div>
              </>
            )}

            {canApply && (
              <>
                <Separator />
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleApply}
                  disabled={applying}
                >
                  {applying ? 'Submitting...' : 'Apply for this Task'}
                </Button>
              </>
            )}

            {application && (
              <>
                <Separator />
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium mb-1">Your Application</p>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant="secondary">{application.status}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied on {format(new Date(application.applied_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskDetails;
