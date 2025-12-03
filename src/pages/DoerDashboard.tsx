import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useUser } from '@/components/UserContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Briefcase, DollarSign, Star, TrendingUp } from 'lucide-react';
import Navigation from '@/components/Navigation';

const DoerDashboard = () => {
  const { t } = useLanguage();
  const { user } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeGigs: 0,
    completedJobs: 0,
    totalEarned: 0,
    rating: 0
  });
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myGigs, setMyGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const dashboardStats = [
    {
      title: 'Active Gigs',
      value: stats.activeGigs.toString(),
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Completed Jobs',
      value: stats.completedJobs.toString(),
      icon: Star,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Earned',
      value: `₹${stats.totalEarned.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Rating',
      value: stats.rating.toFixed(1),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        // Fetch active gigs (assigned tasks)
        const { data: activeGigsData } = await supabase
          .from('tasks')
          .select('*')
          .eq('doer_id', user.id)
          .in('status', ['assigned', 'in_progress']);

        // Fetch completed jobs
        const { data: completedJobsData } = await supabase
          .from('tasks')
          .select('*')
          .eq('doer_id', user.id)
          .eq('status', 'completed');

        // Fetch payments for total earned
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount')
          .eq('doer_id', user.id)
          .eq('payment_status', 'completed');

        // Fetch ratings
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('stars')
          .eq('to_user', user.id);

        // Fetch available tasks (open tasks)
        const { data: availableTasksData } = await supabase
          .from('tasks')
          .select(`
            *,
            users!tasks_client_id_fkey(name)
          `)
          .eq('status', 'open')
          .limit(5);

        // Calculate stats
        const totalEarned = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const avgRating = ratingsData?.length > 0 
          ? ratingsData.reduce((sum, rating) => sum + rating.stars, 0) / ratingsData.length 
          : 0;

        setStats({
          activeGigs: activeGigsData?.length || 0,
          completedJobs: completedJobsData?.length || 0,
          totalEarned,
          rating: avgRating
        });

        setAvailableTasks(availableTasksData || []);
        setMyGigs(activeGigsData || []);
      } catch (error) {
        logger.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{t('welcome')}, Doer!</h1>
          <p className="text-white/90 mb-4">
            Find tasks that match your skills and start earning today.
          </p>
          <Button 
            className="bg-white text-primary hover:bg-white/90 rounded-2xl"
            onClick={() => navigate('/browse-tasks')}
          >
            <Search className="h-4 w-4 mr-2" />
            {t('browseAllTasks')}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                      <IconComponent className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Available Tasks */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Available Tasks</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl"
                  onClick={() => navigate('/browse-tasks')}
                >
                  Browse All
                </Button>
              </CardTitle>
              <CardDescription>
                New tasks matching your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No available tasks at the moment.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/browse-tasks')}
                    >
                      Browse All Tasks
                    </Button>
                  </div>
                ) : (
                  availableTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        <span className="text-lg font-bold text-primary">₹{task.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                        <span>{task.category}</span>
                        <span>•</span>
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{task.users?.name || 'Anonymous'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                      <Button 
                        size="sm" 
                        className="w-full rounded-xl"
                        onClick={() => navigate('/browse-tasks')}
                      >
                        Apply Now
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Gigs */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('myGigs')}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl"
                  onClick={() => navigate('/my-gigs')}
                >
                  View All
                </Button>
              </CardTitle>
              <CardDescription>
                Your current active projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myGigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active gigs at the moment.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/browse-tasks')}
                    >
                      Find Tasks
                    </Button>
                  </div>
                ) : (
                  myGigs.map((gig) => (
                    <div
                      key={gig.id}
                      className="p-4 bg-muted/50 rounded-2xl"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{gig.title}</h3>
                        <span className="text-lg font-bold text-primary">₹{gig.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-3">
                        <span>{new Date(gig.deadline).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{gig.description}</p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            gig.status === 'in_progress'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          {gig.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl"
                          onClick={() => navigate('/my-gigs')}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoerDashboard;