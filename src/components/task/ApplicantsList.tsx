import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, Star, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface DoerProfile {
  id: string;
  name: string;
  photo_url: string | null;
  skills: string[];
  avg_rating: number;
  total_reviews: number;
  completed_tasks: number;
}

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
  profile?: DoerProfile | null;
}

interface ApplicantsListProps {
  taskId: string;
  onAssign?: () => void;
}

// Skills are now returned as actual names from the database

const ApplicantsList: React.FC<ApplicantsListProps> = ({ taskId, onAssign }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicants();
  }, [taskId]);

  const fetchApplicants = async () => {
    try {
      // Fetch applications with basic doer info
      const { data, error } = await supabase
        .from('task_applications')
        .select(`
          *,
          doer:users!task_applications_doer_id_fkey(id, name, photo_url)
        `)
        .eq('task_id', taskId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for all doers
      const doerIds = (data || []).map(a => a.doer_id);
      const profilesMap: Record<string, DoerProfile> = {};

      if (doerIds.length > 0) {
        const { data: profiles } = await supabase.rpc('get_public_profiles', { _user_ids: doerIds });
        
        // Also fetch detailed profile for each
        for (const doerId of doerIds) {
          const { data: profileData } = await supabase.rpc('get_doer_profile', { _user_id: doerId });
          if (profileData && profileData.length > 0) {
            profilesMap[doerId] = profileData[0];
          }
        }
      }

      const enrichedApplicants = (data || []).map(applicant => ({
        ...applicant,
        profile: profilesMap[applicant.doer_id] || null,
      }));

      setApplicants(enrichedApplicants);
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
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          doer_id: application.doer_id,
          status: 'in_progress'
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      const { error: acceptError } = await supabase
        .from('task_applications')
        .update({ status: 'accepted' })
        .eq('id', application.id);

      if (acceptError) throw acceptError;

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
                <Avatar className="h-12 w-12">
                  <AvatarImage src={applicant.doer.photo_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {applicant.doer.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{applicant.doer.name}</h4>
                      {/* Rating and stats */}
                      {applicant.profile && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {applicant.profile.avg_rating.toFixed(1)}
                            <span className="text-xs">({applicant.profile.total_reviews})</span>
                          </span>
                          <span>{applicant.profile.completed_tasks} tasks done</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(applicant.status)}
                  </div>

                  {/* Skills badges */}
                  {applicant.profile?.skills && applicant.profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {applicant.profile.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {applicant.profile.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{applicant.profile.skills.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Applied {format(new Date(applicant.applied_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => navigate(`/doer/${applicant.doer_id}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Profile
                    </Button>
                  </div>

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