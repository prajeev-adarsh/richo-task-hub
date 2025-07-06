import React from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckSquare, DollarSign, TrendingUp, AlertCircle, Eye } from 'lucide-react';

const AdminDashboard = () => {
  const { t } = useLanguage();

  const stats = [
    {
      title: 'Total Users',
      value: '2,847',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+12%',
    },
    {
      title: 'Active Tasks',
      value: '156',
      icon: CheckSquare,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      change: '+8%',
    },
    {
      title: 'Total Revenue',
      value: '₹2,84,750',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      change: '+15%',
    },
    {
      title: 'Platform Rating',
      value: '4.6',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+0.2',
    },
  ];

  const recentUsers = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      role: 'client',
      joinDate: '2024-01-15',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Priya Sharma',
      email: 'priya@example.com',
      role: 'doer',
      joinDate: '2024-01-14',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Amit Patel',
      email: 'amit@example.com',
      role: 'doer',
      joinDate: '2024-01-13',
      status: 'Pending',
    },
  ];

  const alerts = [
    {
      id: 1,
      type: 'warning',
      message: 'High volume of support tickets in last 24h',
      time: '2 hours ago',
    },
    {
      id: 2,
      type: 'info',
      message: 'New feature deployment scheduled for tonight',
      time: '4 hours ago',
    },
    {
      id: 3,
      type: 'success',
      message: 'Monthly revenue target achieved',
      time: '1 day ago',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Admin {t('dashboard')}</h1>
        <p className="text-white/90 mb-4">
          Monitor platform performance, manage users, and oversee operations.
        </p>
        <div className="flex space-x-3">
          <Button className="bg-white text-primary hover:bg-white/90 rounded-2xl">
            <Users className="h-4 w-4 mr-2" />
            {t('manageUsers')}
          </Button>
          <Button variant="outline" className="border-white text-white hover:bg-white/10 rounded-2xl">
            <Eye className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <IconComponent className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-success">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Users</span>
              <Button variant="outline" size="sm" className="rounded-xl">
                View All
              </Button>
            </CardTitle>
            <CardDescription>
              Latest user registrations and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'Active'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {user.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{user.joinDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span>System Alerts</span>
            </CardTitle>
            <CardDescription>
              Important notifications and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-2xl border-l-4 ${
                    alert.type === 'warning'
                      ? 'bg-warning/5 border-warning'
                      : alert.type === 'success'
                      ? 'bg-success/5 border-success'
                      : 'bg-primary/5 border-primary'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;