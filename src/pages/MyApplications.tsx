import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Clock, CheckCircle, XCircle, MapPin, IndianRupee, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navigation from '@/components/Navigation';

interface Application {
  id: string;
  task_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied_at: string;
  task: {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    is_remote: boolean;
    budget: number;
    deadline: string;
    status: string;
    client: {
      name: string;
    } | null;
  };
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    badgeVariant: 'outline' as const,
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    badgeVariant: 'default' as const,
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    badgeVariant: 'destructive' as const,
  },
};

const MyApplications = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('task_applications')
          .select(`
            id,
            task_id,
            status,
            applied_at,
            tasks!task_applications_task_id_fkey (
              id,
              title,
              description,
              category,
              location,
              is_remote,
              budget,
              deadline,
              status,
              users!tasks_client_id_fkey (
                name
              )
            )
          `)
          .eq('doer_id', user.id)
          .order('applied_at', { ascending: false });

        if (error) throw error;

        const formattedApplications = (data || []).map((app: any) => ({
          id: app.id,
          task_id: app.task_id,
          status: app.status,
          applied_at: app.applied_at,
          task: {
            id: app.tasks.id,
            title: app.tasks.title,
            description: app.tasks.description,
            category: app.tasks.category,
            location: app.tasks.location,
            is_remote: app.tasks.is_remote,
            budget: app.tasks.budget,
            deadline: app.tasks.deadline,
            status: app.tasks.status,
            client: app.tasks.users,
          },
        }));

        setApplications(formattedApplications);
      } catch (error) {
        logger.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user?.id]);

  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'all') return true;
    return app.status === activeTab;
  });

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">My Applications</h1>
              <p className="text-muted-foreground">Track the status of your job applications</p>
            </div>
          </div>
          <Button onClick={() => navigate('/browse-tasks')}>
            Browse More Tasks
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.all}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.accepted}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="gap-2">
              All <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              Pending <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="gap-2">
              Accepted <Badge variant="secondary" className="ml-1">{counts.accepted}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rejected <Badge variant="secondary" className="ml-1">{counts.rejected}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {activeTab === 'all' ? 'No applications yet' : `No ${activeTab} applications`}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'all'
                      ? 'Start applying to tasks to see them here'
                      : `You don't have any ${activeTab} applications`}
                  </p>
                  {activeTab === 'all' && (
                    <Button onClick={() => navigate('/browse-tasks')}>Browse Tasks</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => {
                  const statusConfig = STATUS_CONFIG[app.status];
                  const StatusIcon = statusConfig.icon;
                  const isTaskOpen = app.task.status === 'open';

                  return (
                    <Card key={app.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Status Indicator */}
                          <div className={`w-12 h-12 ${statusConfig.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                            <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                          </div>

                          {/* Task Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2">
                              <h3 className="font-semibold text-lg line-clamp-1">{app.task.title}</h3>
                              <Badge variant={statusConfig.badgeVariant} className="shrink-0">
                                {statusConfig.label}
                              </Badge>
                              {!isTaskOpen && (
                                <Badge variant="outline" className="shrink-0 text-muted-foreground">
                                  Task {app.task.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {app.task.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <IndianRupee className="h-4 w-4" />
                                <span className="font-medium text-foreground">₹{app.task.budget.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{app.task.is_remote ? 'Remote' : app.task.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Applied {format(new Date(app.applied_at), 'MMM dd, yyyy')}</span>
                              </div>
                              {app.task.client && (
                                <span>by {app.task.client.name}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/task/${app.task.id}`)}
                            >
                              View Task
                            </Button>
                            {app.status === 'accepted' && (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/chat/${app.task.id}`)}
                              >
                                Open Chat
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyApplications;
