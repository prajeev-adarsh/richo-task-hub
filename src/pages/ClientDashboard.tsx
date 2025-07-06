import React from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, CheckSquare, Clock, DollarSign, Users } from 'lucide-react';

const ClientDashboard = () => {
  const { t } = useLanguage();

  const stats = [
    {
      title: 'Active Tasks',
      value: '12',
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Completed Tasks',
      value: '47',
      icon: CheckSquare,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Spent',
      value: '₹12,450',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Active Doers',
      value: '8',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const recentTasks = [
    {
      id: 1,
      title: 'Design mobile app UI',
      category: 'Design',
      status: 'In Progress',
      budget: '₹5,000',
      applicants: 12,
    },
    {
      id: 2,
      title: 'Write blog content',
      category: 'Writing',
      status: 'Open',
      budget: '₹2,500',
      applicants: 8,
    },
    {
      id: 3,
      title: 'Data entry project',
      category: 'Data',
      status: 'Completed',
      budget: '₹1,200',
      applicants: 5,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">{t('welcome')}, Client!</h1>
        <p className="text-white/90 mb-4">
          Manage your tasks, track progress, and connect with skilled professionals.
        </p>
        <Button className="bg-white text-primary hover:bg-white/90 rounded-2xl">
          <PlusCircle className="h-4 w-4 mr-2" />
          {t('postNewTask')}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
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

      {/* Recent Tasks */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('myTasks')}</span>
            <Button variant="outline" size="sm" className="rounded-xl">
              View All
            </Button>
          </CardTitle>
          <CardDescription>
            Track your posted tasks and their progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{task.title}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                    <span>{task.category}</span>
                    <span>•</span>
                    <span>{task.budget}</span>
                    <span>•</span>
                    <span>{task.applicants} applicants</span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      task.status === 'Completed'
                        ? 'bg-success/10 text-success'
                        : task.status === 'In Progress'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-accent/10 text-accent'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;