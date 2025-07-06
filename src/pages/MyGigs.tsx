import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, IndianRupee, Upload, FileText, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

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
  client_id: string;
  created_at: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

interface ProofSubmission {
  id: string;
  task_id: string;
  file_url: string;
  notes: string;
  submitted_at: string;
  status: string;
}

const MyGigs = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [proofSubmissions, setProofSubmissions] = useState<ProofSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProofSubmissions();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          client:users!tasks_client_id_fkey(id, name, email)
        `)
        .eq('doer_id', user.id)
        .eq('status', 'in_progress')
        .order('deadline', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load your gigs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProofSubmissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('proof_submissions')
        .select('*')
        .eq('doer_id', user.id);

      if (error) throw error;
      setProofSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching proof submissions:', error);
    }
  };

  const hasSubmittedProof = (taskId: string) => {
    return proofSubmissions.some(proof => proof.task_id === taskId);
  };

  const getProofStatus = (taskId: string) => {
    const proof = proofSubmissions.find(p => p.task_id === taskId);
    return proof?.status || null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File, taskId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${taskId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('proofs')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmitProof = async () => {
    if (!selectedFile || !selectedTask || !user) {
      toast({
        title: "Missing information",
        description: "Please select a file and add notes",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload file to storage
      const fileUrl = await uploadFile(selectedFile, selectedTask.id);
      
      clearInterval(progressInterval);
      setUploadProgress(95);

      // Save proof submission to database
      const { error } = await supabase
        .from('proof_submissions')
        .insert({
          task_id: selectedTask.id,
          doer_id: user.id,
          file_url: fileUrl,
          notes: notes.trim() || null
        });

      if (error) throw error;

      setUploadProgress(100);

      toast({
        title: "✅ Proof submitted successfully!",
        description: "Your proof has been sent to the client for review",
      });

      // Reset form and close modal
      setSelectedFile(null);
      setNotes('');
      setShowProofModal(false);
      setSelectedTask(null);
      
      // Refresh proof submissions
      fetchProofSubmissions();
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast({
        title: "Error",
        description: "Failed to submit proof. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const openProofModal = (task: Task) => {
    setSelectedTask(task);
    setShowProofModal(true);
    setSelectedFile(null);
    setNotes('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <p className="text-muted-foreground">Loading your gigs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Gigs</h1>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No active gigs</h3>
              <p className="text-muted-foreground mb-4">Your assigned tasks will appear here</p>
              <Button onClick={() => window.location.href = '/browse-tasks'}>
                Browse Tasks
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => {
              const hasProof = hasSubmittedProof(task.id);
              const proofStatus = getProofStatus(task.id);
              
              return (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">In Progress</Badge>
                      {hasProof && (
                        <Badge variant={
                          proofStatus === 'accepted' ? 'default' :
                          proofStatus === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          Proof {proofStatus}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Client:</span>
                        <span>{task.client.name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                        <span className="font-medium">₹{task.budget.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span>Due: {format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      {hasProof ? (
                        <Button variant="secondary" size="sm" className="w-full" disabled>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Proof Submitted
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => openProofModal(task)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Proof
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Proof Submission Modal */}
        <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Proof of Completion</DialogTitle>
              <DialogDescription>
                {selectedTask && `Upload proof for: ${selectedTask.title}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proof-file">Upload File</Label>
                <Input
                  id="proof-file"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, PDF, DOC, DOCX (max 10MB)
                </p>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof-notes">Notes (Optional)</Label>
                <Textarea
                  id="proof-notes"
                  placeholder="Add any additional notes about your work..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={uploading}
                  className="min-h-[80px]"
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowProofModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitProof}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Submitting...' : 'Submit Proof'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyGigs;