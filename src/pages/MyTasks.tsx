import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, IndianRupee, Users, Clock, CheckCircle, XCircle, Eye, Star, CreditCard, Upload, Pencil, Trash2, FileText, Download, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import EditTaskDialog from '@/components/task/EditTaskDialog';
import DeleteTaskDialog from '@/components/task/DeleteTaskDialog';
import CancelTaskDialog from '@/components/task/CancelTaskDialog';

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
  payment_status: string | null;
  doer?: {
    id: string;
    name: string;
    email: string;
    photo_url: string | null;
    upi_id: string | null;
  };
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

interface ProofSubmission {
  id: string;
  task_id: string;
  doer_id: string;
  file_url: string;
  notes: string;
  submitted_at: string;
  status: string;
}

interface Rating {
  task_id: string;
}

const MyTasks = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [proofSubmissions, setProofSubmissions] = useState<ProofSubmission[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProof, setSelectedProof] = useState<ProofSubmission | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [processingProof, setProcessingProof] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Rating state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Signed URL state
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);

  // Payment state
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  // Edit/Delete/Cancel state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToCancel, setTaskToCancel] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  useEffect(() => {
    if (tasks.length > 0) {
      fetchProofSubmissions();
      fetchRatings();
    }
  }, [tasks]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          doer:users!tasks_doer_id_fkey(id, name, email, photo_url, upi_id)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      logger.error('Error fetching tasks:', error);
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
      logger.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    }
  };

  const fetchProofSubmissions = async () => {
    if (!user || tasks.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('proof_submissions')
        .select('*')
        .in('task_id', tasks.map(task => task.id));

      if (error) throw error;
      setProofSubmissions(data || []);
    } catch (error) {
      logger.error('Error fetching proof submissions:', error);
    }
  };

  const fetchRatings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('task_id')
        .eq('from_user', user.id);

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      logger.error('Error fetching ratings:', error);
    }
  };

  const getProofForTask = (taskId: string) => {
    return proofSubmissions.find(proof => proof.task_id === taskId);
  };

  const hasRated = (taskId: string) => {
    return ratings.some(rating => rating.task_id === taskId);
  };

  const handleViewApplications = async (task: Task) => {
    setSelectedTask(task);
    setShowApplicationsModal(true);
    await fetchApplications(task.id);
  };

  const handleViewProof = async (task: Task) => {
    const proof = getProofForTask(task.id);
    if (proof) {
      setSelectedTask(task);
      setSelectedProof(proof);
      setShowProofModal(true);
      setProofSignedUrl(null);
      
      // Generate signed URL for the proof file
      setLoadingSignedUrl(true);
      try {
        const { data, error } = await supabase.storage
          .from('proofs')
          .createSignedUrl(proof.file_url, 3600); // 1 hour expiry
        
        if (error) {
          logger.error('Error creating signed URL:', error);
          toast({
            title: "Error",
            description: "Failed to load proof file",
            variant: "destructive",
          });
        } else {
          setProofSignedUrl(data.signedUrl);
        }
      } catch (error) {
        logger.error('Error creating signed URL:', error);
      } finally {
        setLoadingSignedUrl(false);
      }
    }
  };

  const handleAcceptProof = async () => {
    if (!selectedTask || !selectedProof) return;

    setProcessingProof('accept');
    try {
      // Update task status to completed
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', selectedTask.id);

      if (taskError) throw taskError;

      // Update proof submission status to accepted
      const { error: proofError } = await supabase
        .from('proof_submissions')
        .update({ status: 'accepted' })
        .eq('id', selectedProof.id);

      if (proofError) throw proofError;

      toast({
        title: "✅ Proof accepted!",
        description: "Task has been marked as completed",
      });

      // Refresh tasks and close modal
      fetchTasks();
      fetchProofSubmissions();
      setShowProofModal(false);
      
      // Show rating modal if not already rated
      if (!hasRated(selectedTask.id)) {
        setTimeout(() => {
          setShowRatingModal(true);
        }, 500);
      }
    } catch (error) {
      logger.error('Error accepting proof:', error);
      toast({
        title: "Error",
        description: "Failed to accept proof",
        variant: "destructive",
      });
    } finally {
      setProcessingProof(null);
    }
  };

  const handleRejectProof = async () => {
    if (!selectedProof) return;

    setProcessingProof('reject');
    try {
      const { error } = await supabase
        .from('proof_submissions')
        .update({ status: 'rejected' })
        .eq('id', selectedProof.id);

      if (error) throw error;

      toast({
        title: "❌ Proof rejected",
        description: "The doer can now re-upload their proof",
      });

      // Refresh proof submissions and close modal
      fetchProofSubmissions();
      setShowProofModal(false);
    } catch (error) {
      logger.error('Error rejecting proof:', error);
      toast({
        title: "Error",
        description: "Failed to reject proof",
        variant: "destructive",
      });
    } finally {
      setProcessingProof(null);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedTask || !selectedTask.doer || rating === 0) return;

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          task_id: selectedTask.id,
          from_user: user!.id,
          to_user: selectedTask.doer.id,
          stars: rating,
          review: review.trim() || null
        });

      if (error) throw error;

      toast({
        title: "⭐ Rating submitted!",
        description: "Thank you for your feedback",
      });

      // Refresh ratings and close modal
      fetchRatings();
      setShowRatingModal(false);
      setRating(0);
      setReview('');
      setSelectedTask(null);
    } catch (error) {
      logger.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    } finally {
      setSubmittingRating(false);
    }
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
      logger.error('Error assigning task:', error);
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
      logger.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  const handlePaymentFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setPaymentFile(file);
    }
  };

  const uploadPaymentProof = async (file: File, taskId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `payments/${user?.id}/${taskId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Return the file path, not a public URL - signed URLs will be generated when viewing
    return fileName;
  };

  const handleMarkAsPaid = async () => {
    if (!selectedTask || !selectedTask.doer || !user) return;

    // Validate task is completed before allowing payment
    if (selectedTask.status !== 'completed') {
      toast({
        title: "Cannot release payment",
        description: "Payment can only be released for completed tasks",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);
    try {
      let uploadedProofUrl = null;
      
      // Upload payment proof if file is selected
      if (paymentFile) {
        uploadedProofUrl = await uploadPaymentProof(paymentFile, selectedTask.id);
      }

      // Use secure RPC function that validates task completion
      const { data, error: paymentError } = await supabase
        .rpc('release_payment', {
          p_task_id: selectedTask.id,
          p_payment_proof_url: uploadedProofUrl
        });

      if (paymentError) {
        // Handle specific error messages from the RPC
        if (paymentError.message.includes('completed')) {
          throw new Error('Task must be completed before releasing payment');
        } else if (paymentError.message.includes('Proof of completion')) {
          throw new Error('Please accept the proof of completion first');
        } else if (paymentError.message.includes('already been released')) {
          throw new Error('Payment has already been released for this task');
        }
        throw paymentError;
      }

      toast({
        title: "✅ Payment marked as paid",
        description: `You've confirmed payment of ₹${selectedTask.budget.toLocaleString()} to ${selectedTask.doer.name}`,
      });

      // Refresh tasks and close modal
      fetchTasks();
      setShowPaymentModal(false);
      setPaymentFile(null);
      setSelectedTask(null);
    } catch (error) {
      logger.error('Error marking payment as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark payment as paid",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentModal = (task: Task) => {
    setSelectedTask(task);
    setShowPaymentModal(true);
    setPaymentFile(null);
  };

  // Edit task handler
  const handleEditTask = async (taskId: string, data: {
    title: string;
    description: string;
    category: 'student' | 'skilled' | 'ai' | 'custom';
    location: string;
    is_remote: boolean;
    budget: number;
    deadline: Date;
    proof_required: boolean;
  }) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          description: data.description,
          category: data.category,
          location: data.location,
          is_remote: data.is_remote,
          budget: data.budget,
          deadline: data.deadline.toISOString(),
          proof_required: data.proof_required,
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Updated",
        description: "Your task has been updated successfully",
      });

      fetchTasks();
      setShowEditModal(false);
      setTaskToEdit(null);
    } catch (error) {
      logger.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete task handler
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    setDeleting(true);
    try {
      // First delete associated applications
      const { error: appError } = await supabase
        .from('task_applications')
        .delete()
        .eq('task_id', taskToDelete.id);

      if (appError) throw appError;

      // Delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id);

      if (error) throw error;

      toast({
        title: "Task Deleted",
        description: "Your task has been deleted successfully",
      });

      fetchTasks();
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      logger.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setShowEditModal(true);
  };

  const openDeleteModal = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const openCancelModal = (task: Task) => {
    setTaskToCancel(task);
    setShowCancelModal(true);
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

                  {/* Payment Section for in_progress tasks with doer */}
                  {task.status === 'in_progress' && task.doer && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">Payment</span>
                          {task.payment_status === 'paid' && (
                            <Badge variant="default" className="ml-auto">
                              ✅ Marked as Paid
                            </Badge>
                          )}
                        </div>
                        
                        {task.payment_status !== 'paid' && (
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Doer:</span> {task.doer.name}
                            </div>
                            {task.doer.upi_id && (
                              <div className="text-sm">
                                <span className="font-medium">UPI ID:</span> {task.doer.upi_id}
                              </div>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => openPaymentModal(task)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Mark as Paid
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/task/${task.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewApplications(task)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Applications
                      </Button>
                    
                    {/* Show View Proof button for in_progress tasks with proof */}
                    {task.status === 'in_progress' && getProofForTask(task.id) && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewProof(task)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Proof
                      </Button>
                    )}
                    
                      {/* Show Rate Doer button for completed tasks without rating */}
                      {task.status === 'completed' && !hasRated(task.id) && task.doer && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowRatingModal(true);
                          }}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Rate
                        </Button>
                      )}
                    </div>

                    {/* Edit/Delete buttons for open tasks only */}
                    {task.status === 'open' && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openEditModal(task)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openDeleteModal(task)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}

                    {/* Cancel button for in_progress tasks */}
                    {task.status === 'in_progress' && (
                      <div className="pt-2 border-t border-border">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openCancelModal(task)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Cancel Task
                        </Button>
                      </div>
                    )}
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

        {/* Proof Review Modal */}
        <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Proof of Completion</DialogTitle>
              <DialogDescription>
                {selectedTask && `Proof for: ${selectedTask.title}`}
              </DialogDescription>
            </DialogHeader>

            {selectedProof && (
              <div className="space-y-6">
                {/* File Preview/Download */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Submitted File</Label>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium">Proof Document</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {format(new Date(selectedProof.submitted_at), 'MMM dd, yyyy at h:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => proofSignedUrl && window.open(proofSignedUrl, '_blank')}
                        disabled={loadingSignedUrl || !proofSignedUrl}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {loadingSignedUrl ? 'Loading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Doer's Notes */}
                {selectedProof.notes && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Doer's Notes</Label>
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <p className="text-sm">{selectedProof.notes}</p>
                    </div>
                  </div>
                )}

                {/* Proof Status */}
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Badge variant={
                    selectedProof.status === 'accepted' ? 'default' :
                    selectedProof.status === 'rejected' ? 'destructive' : 'secondary'
                  }>
                    {selectedProof.status.charAt(0).toUpperCase() + selectedProof.status.slice(1)}
                  </Badge>
                </div>
              </div>
            )}

            {selectedProof?.status === 'pending' && (
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowProofModal(false)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectProof}
                  disabled={processingProof === 'reject'}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {processingProof === 'reject' ? 'Rejecting...' : 'Reject Proof'}
                </Button>
                <Button
                  onClick={handleAcceptProof}
                  disabled={processingProof === 'accept'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processingProof === 'accept' ? 'Accepting..' : 'Accept Proof'}
                </Button>
              </DialogFooter>
            )}

            {selectedProof?.status !== 'pending' && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProofModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Rating Modal */}
        <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>⭐ Rate Doer</DialogTitle>
              <DialogDescription>
                How was your experience with {selectedTask?.doer?.name}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Star Rating */}
              <div className="space-y-3">
                <Label>Rating (1-5 stars)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      <Star className="h-8 w-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="space-y-3">
                <Label htmlFor="review">Review (Optional)</Label>
                <Textarea
                  id="review"
                  placeholder="Share your feedback about the work quality, communication, etc..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setReview('');
                }}
                disabled={submittingRating}
              >
                Skip
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={rating === 0 || submittingRating}
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Payment Confirmation Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                {selectedTask && selectedTask.doer && 
                  `You confirm that you've paid ₹${selectedTask.budget.toLocaleString()} to ${selectedTask.doer.name} via UPI.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-proof">Payment Screenshot (Optional)</Label>
                <Input
                  id="payment-proof"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handlePaymentFileSelect}
                  disabled={processingPayment}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, PDF (max 5MB)
                </p>
                {paymentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{paymentFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentModal(false)}
                disabled={processingPayment}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMarkAsPaid}
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <EditTaskDialog
          task={taskToEdit}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSave={handleEditTask}
          saving={saving}
        />

        {/* Delete Task Dialog */}
        <DeleteTaskDialog
          taskTitle={taskToDelete?.title || ''}
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={handleDeleteTask}
          deleting={deleting}
        />

        {/* Cancel Task Dialog */}
        <CancelTaskDialog
          task={taskToCancel}
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          onSuccess={fetchTasks}
        />
      </div>
    </div>
  );
};

export default MyTasks;