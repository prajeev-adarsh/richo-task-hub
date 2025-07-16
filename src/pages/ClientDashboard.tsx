import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/components/LanguageContext';
import { useUser } from '@/components/UserContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, CheckSquare, Clock, DollarSign, Users, RefreshCw, AlertCircle } from 'lucide-react';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useUser();
  const { stats, recentTasks, isLoading, error, refresh } = useDashboardData();

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success';
      case 'in_progress':
      case 'assigned':
        return 'bg-primary/10 text-primary';
      case 'open':
        return 'bg-accent/10 text-accent';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const statsConfig = [
    {
      title: 'Active Tasks',
      value: stats.activeTasks.toString(),
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Completed Tasks',
      value: stats.completedTasks.toString(),
      icon: CheckSquare,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Active Doers',
      value: stats.activeDoers.toString(),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('welcome')}, {user?.name || 'Client'}!</h1>
            <p className="text-white/90 mb-4">
              Manage your tasks, track progress, and connect with skilled professionals.
            </p>
            <Button 
              className="bg-white text-primary hover:bg-white/90 rounded-2xl"
              onClick={() => navigate('/post-task')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {t('postNewTask')}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="rounded-2xl border-destructive/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Error loading dashboard data</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <IconComponent className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? '...' : stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Tasks */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Tasks</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl"
              onClick={() => navigate('/my-tasks')}
            >
              View All
            </Button>
          </CardTitle>
          <CardDescription>
            Track your posted tasks and their progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by posting your first task to connect with skilled professionals.
              </p>
              <Button onClick={() => navigate('/post-task')} className="rounded-xl">
                <PlusCircle className="h-4 w-4 mr-2" />
                Post Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate('/my-tasks')}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span className="capitalize">{task.category}</span>
                      <span>•</span>
                      <span>{formatCurrency(task.budget)}</span>
                      <span>•</span>
                      <span>{task.applicantCount} applicant{task.applicantCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;