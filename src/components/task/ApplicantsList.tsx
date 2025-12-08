import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface Applicant {
  id: string;
  task_id: string;
  doer_id: string;
  status: string;
  applied_at: string;
  doer: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}

interface ApplicantsListProps {
  taskId: string;
  onAssign?: () => void;
}

const ApplicantsList: React.FC<ApplicantsListProps> = ({ taskId, onAssign }) => {
  const { toast } = useToast();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicants();
  }, [taskId]);

  const fetchApplicants = async () => {
    try {
      // Only fetch non-sensitive user fields (no email, phone, upi_id)
      const { data, error } = await supabase
        .from('task_applications')
        .select(`
          *,
          doer:users!task_applications_doer_id_fkey(id, name, photo_url)
        `)
        .eq('task_id', taskId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplicants(data || []);
    } catch (error) {
      logger.error('Error fetching applicants:', error);
      toast({
        title: "Error",
        description: "Failed to load applicants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (application: Applicant) => {
    setProcessing(application.id);
    try {
      // Update task to assign doer
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          doer_id: application.doer_id,
          status: 'in_progress'
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Update application status to accepted
      const { error: acceptError } = await supabase
        .from('task_applications')
        .update({ status: 'accepted' })
        .eq('id', application.id);

      if (acceptError) throw acceptError;

      // Update other applications to rejected
      const { error: rejectError } = await supabase
        .from('task_applications')
        .update({ status: 'rejected' })
        .eq('task_id', taskId)
        .neq('id', application.id);

      if (rejectError) throw rejectError;

      toast({
        title: "Task assigned!",
        description: `${application.doer.name} has been assigned to this task`,
      });

      if (onAssign) onAssign();
      fetchApplicants();
    } catch (error) {
      logger.error('Error accepting application:', error);
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (applicationId: string, doerName: string) => {
    setProcessing(applicationId);
    try {
      const { error } = await supabase
        .from('task_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Application rejected",
        description: `${doerName}'s application has been rejected`,
      });

      fetchApplicants();
    } catch (error) {
      logger.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-sm">Loading applicants...</p>
        </CardContent>
      </Card>
    );
  }

  if (applicants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No applications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Wait for doers to apply to your task
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applicants.map((applicant, index) => (
        <React.Fragment key={applicant.id}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {applicant.doer.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{applicant.doer.name}</h4>
                    </div>
                    {getStatusBadge(applicant.status)}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Applied on {format(new Date(applicant.applied_at), 'MMM dd, yyyy HH:mm')}
                  </p>

                  {applicant.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(applicant)}
                        disabled={processing !== null}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(applicant.id, applicant.doer.name)}
                        disabled={processing !== null}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {index < applicants.length - 1 && <Separator />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ApplicantsList;
