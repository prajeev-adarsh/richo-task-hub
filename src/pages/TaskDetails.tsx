import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Calendar, IndianRupee, User, FileText, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import TaskComments from '@/components/task/TaskComments';
import TaskTimeline from '@/components/task/TaskTimeline';
import ApplicantsList from '@/components/task/ApplicantsList';
import TaskActionButtons from '@/components/task/TaskActionButtons';

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
  client_id: string;
  doer_id: string | null;
  client: {
    id: string;
    name: string;
    photo_url: string | null;
  };
  doer?: {
    id: string;
    name: string;
    photo_url: string | null;
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
  const { user, role } = useUser();
  const { toast } = useToast();
  
  const [task, setTask] = useState<Task | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [applicantCount, setApplicantCount] = useState(0);
  const [hasProof, setHasProof] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTaskDetails();
    }
  }, [id, user]);

  // Keep applicant count + application status in sync without needing a manual refresh
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`task-${id}-applications`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_applications', filter: `task_id=eq.${id}` },
        () => {
          fetchTaskDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchTaskDetails = async () => {
    if (!id) return;

    try {
      // Fetch task without user joins (RLS restricts direct user access)
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (taskError) throw taskError;

      // Fetch public profiles for client and doer via secure RPC
      const userIds = [taskData.client_id, taskData.doer_id].filter(Boolean) as string[];
      const { data: profiles } = await supabase.rpc('get_public_profiles', { _user_ids: userIds });

      const profileMap: Record<string, { id: string; name: string; photo_url: string | null }> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = { id: p.id, name: p.name, photo_url: p.photo_url };
      });

      const enrichedTask = {
        ...taskData,
        client: profileMap[taskData.client_id] || { id: taskData.client_id, name: 'Unknown', photo_url: null },
        doer: taskData.doer_id ? (profileMap[taskData.doer_id] || { id: taskData.doer_id, name: 'Unknown', photo_url: null }) : undefined,
      };

      setTask(enrichedTask);

      // Fetch applicant count
      const { count } = await supabase
        .from('task_applications')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', id);
      
      setApplicantCount(count || 0);

      // Check if proof exists
      const { data: proofData } = await supabase
        .from('proof_submissions')
        .select('id')
        .eq('task_id', id)
        .limit(1);
      
      setHasProof((proofData?.length || 0) > 0);

      // Check if current user has applied (doers only)
      if (user && role === 'doer') {
        const { data: appData } = await supabase
          .from('task_applications')
          .select('*')
          .eq('task_id', id)
          .eq('doer_id', user.id)
          .single();
        
        setApplication(appData);
      }
    } catch (error) {
      logger.error('Error fetching task:', error);
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
    if (applying) return; // Prevent double-click

    setApplying(true);
    try {
      const { error } = await supabase
        .from('task_applications')
        .insert({
          task_id: task.id,
          doer_id: user.id,
        });

      if (error) {
        // Handle duplicate application gracefully
        if (error.code === '23505') {
          toast({
            title: "Already Applied",
            description: "You have already applied for this task",
          });
          fetchTaskDetails();
          return;
        }
        throw error;
      }

      toast({
        title: "✅ Application submitted!",
        description: "The client will review your application",
      });

      fetchTaskDetails();
    } catch (error: any) {
      logger.error('Error applying:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM dd, yyyy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'completed': return 'bg-gray-500/10 text-gray-600 border-gray-200';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <p className="text-muted-foreground">Loading task details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-20">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Task not found</p>
          <p className="text-muted-foreground mb-4">This task may have been deleted or doesn't exist</p>
          <Button onClick={() => navigate('/browse-tasks')}>
            Back to Browse Tasks
          </Button>
        </div>
      </div>
    );
  }

  const isTaskOwner = user?.id === task.client_id;
  const isAssignedDoer = user?.id === task.doer_id;
  const hasApplied = !!application;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${task.title} | Richo`}
        description={task.description.slice(0, 155)}
        path={`/task/${task.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: task.title,
          description: task.description,
          datePosted: task.created_at,
          validThrough: task.deadline,
          employmentType: 'CONTRACTOR',
          jobLocation: task.is_remote
            ? { '@type': 'Place', address: 'Remote' }
            : { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: task.location } },
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'INR',
            value: { '@type': 'QuantitativeValue', value: task.budget, unitText: 'PROJECT' },
          },
          hiringOrganization: { '@type': 'Organization', name: task.client?.name || 'Richo Client' },
        }}
      />
      <Navigation />

      <main className="max-w-7xl mx-auto p-6">
        <h1 className="sr-only">{task.title}</h1>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Header Card */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-3">{task.title}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getStatusColor(task.status)} border`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {task.category}
                      </Badge>
                      {task.proof_required && (
                        <Badge variant="outline" className="border-orange-200 text-orange-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Proof Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                      ₹{task.budget.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Budget</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                </div>

                <Separator />

                {/* Task Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-sm text-muted-foreground capitalize">{task.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {task.is_remote ? 'Remote Work' : task.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Deadline</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(task.deadline)}
                        </p>
                      </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Client</p>
                      <p className="text-sm text-muted-foreground">{task.client.name}</p>
                    </div>
                  </div>

                  {task.doer && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Assigned Doer</p>
                        <p className="text-sm text-muted-foreground">{task.doer.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-500/10">
                      <Clock className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Posted</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(task.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <TaskComments taskId={task.id} />
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <TaskActionButtons
              taskStatus={task.status}
              userRole={role}
              isTaskOwner={isTaskOwner}
              isAssignedDoer={isAssignedDoer}
              hasApplied={hasApplied}
              applicationStatus={application?.status}
              applying={applying}
              onViewApplicants={() => setShowApplicantsModal(true)}
              onApply={handleApply}
              onOpenChat={() => navigate(`/chat/${task.id}`)}
              applicantCount={applicantCount}
              hasProof={hasProof}
            />

            {/* Timeline */}
            <TaskTimeline
              taskId={task.id}
              taskCreatedAt={task.created_at}
              taskStatus={task.status}
            />

            {/* Quick Stats Card */}
            {isTaskOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Applications</span>
                    <Badge variant="secondary">{applicantCount}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">{task.status.replace('_', ' ')}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Proof Submitted</span>
                    <Badge variant={hasProof ? "default" : "secondary"}>
                      {hasProof ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Applicants Modal */}
        <Dialog open={showApplicantsModal} onOpenChange={setShowApplicantsModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Task Applicants ({applicantCount})</DialogTitle>
            </DialogHeader>
            <ApplicantsList taskId={task.id} onAssign={() => {
              setShowApplicantsModal(false);
              fetchTaskDetails();
            }} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TaskDetails;
