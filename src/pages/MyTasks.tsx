import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, IndianRupee, Users, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

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
  doer_id: string | null;
  created_at: string;
}

interface TaskApplication {
  id: string;
  task_id: string;
  doer_id: string;
  status: string;
  applied_at: string;
  doer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    language: string;
    photo_url: string | null;
  };
}

const MyTasks = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load your tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select(`
          *,
          doer:users!task_applications_doer_id_fkey(*)
        `)
        .eq('task_id', taskId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    }
  };

  const handleViewApplications = async (task: Task) => {
    setSelectedTask(task);
    setShowApplicationsModal(true);
    await fetchApplications(task.id);
  };

  const handleAssignTask = async (application: TaskApplication) => {
    if (!selectedTask) return;

    setAssigning(application.id);
    try {
      // Start transaction-like operations
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          doer_id: application.doer_id,
          status: 'in_progress'
        })
        .eq('id', selectedTask.id);

      if (taskError) throw taskError;

      // Update selected application to accepted
      const { error: acceptError } = await supabase
        .from('task_applications')
        .update({ status: 'accepted' })
        .eq('id', application.id);

      if (acceptError) throw acceptError;

      // Update other applications to rejected
      const { error: rejectError } = await supabase
        .from('task_applications')
        .update({ status: 'rejected' })
        .eq('task_id', selectedTask.id)
        .neq('id', application.id);

      if (rejectError) throw rejectError;

      toast({
        title: `✅ Task assigned to ${application.doer.name}`,
        description: "The doer has been notified and the task is now in progress",
      });

      // Refresh tasks and close modal
      fetchTasks();
      setShowApplicationsModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error assigning task:', error);
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    } finally {
      setAssigning(null);
    }
  };

  const handleRejectApplication = async (application: TaskApplication) => {
    try {
      const { error } = await supabase
        .from('task_applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Application rejected",
        description: `${application.doer.name}'s application has been rejected`,
      });

      // Refresh applications
      if (selectedTask) {
        fetchApplications(selectedTask.id);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Users className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <p className="text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Tasks</h1>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks posted yet</h3>
              <p className="text-muted-foreground mb-4">Start by posting your first task</p>
              <Button onClick={() => window.location.href = '/post-task'}>
                Post a Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                    <Badge className={`${getStatusColor(task.status)} flex items-center gap-1`}>
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                      <span className="font-medium">₹{task.budget.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span>{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewApplications(task)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      View Applications
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Applications Modal */}
        <Dialog open={showApplicationsModal} onOpenChange={setShowApplicationsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Task Applications</DialogTitle>
              <DialogDescription>
                {selectedTask && `Applications for: ${selectedTask.title}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                  <p className="text-muted-foreground">Applications will appear here when doers apply for this task</p>
                </div>
              ) : (
                applications.map((application) => (
                  <Card key={application.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={application.doer.photo_url || ''} />
                          <AvatarFallback>
                            {application.doer.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-medium">{application.doer.name}</h4>
                            <p className="text-sm text-muted-foreground">{application.doer.email}</p>
                            {application.doer.phone && (
                              <p className="text-sm text-muted-foreground">{application.doer.phone}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {application.doer.role}
                            </Badge>
                            <Badge variant="secondary">
                              {application.doer.language.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            Applied {format(new Date(application.applied_at), 'MMM dd, yyyy at h:mm a')}
                          </p>
                          
                          <Badge variant={
                            application.status === 'accepted' ? 'default' :
                            application.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      {application.status === 'pending' && selectedTask?.status === 'open' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectApplication(application)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAssignTask(application)}
                            disabled={assigning === application.id}
                          >
                            {assigning === application.id ? 'Assigning...' : 'Assign'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApplicationsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyTasks;