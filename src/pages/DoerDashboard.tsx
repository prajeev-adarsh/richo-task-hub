import React from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Briefcase, DollarSign, Star, TrendingUp } from 'lucide-react';

const DoerDashboard = () => {
  const { t } = useLanguage();

  const stats = [
    {
      title: 'Active Gigs',
      value: '5',
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Completed Jobs',
      value: '23',
      icon: Star,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Earned',
      value: '₹18,750',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Rating',
      value: '4.8',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const availableTasks = [
    {
      id: 1,
      title: 'Create website mockup',
      category: 'Design',
      budget: '₹3,500',
      deadline: '3 days',
      client: 'TechStart Inc',
      skills: ['UI/UX', 'Figma', 'Responsive'],
    },
    {
      id: 2,
      title: 'Content writing for blog',
      category: 'Writing',
      budget: '₹1,800',
      deadline: '5 days',
      client: 'BlogCorp',
      skills: ['SEO', 'Research', 'Creative Writing'],
    },
    {
      id: 3,
      title: 'Data analysis project',
      category: 'Analytics',
      budget: '₹4,200',
      deadline: '1 week',
      client: 'DataInsights',
      skills: ['Python', 'Excel', 'Visualization'],
    },
  ];

  const myGigs = [
    {
      id: 1,
      title: 'Mobile app development',
      client: 'StartupX',
      status: 'In Progress',
      progress: 75,
      budget: '₹8,000',
      deadline: '2 days left',
    },
    {
      id: 2,
      title: 'Logo design project',
      client: 'BrandCo',
      status: 'Review',
      progress: 100,
      budget: '₹2,500',
      deadline: 'Pending review',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">{t('welcome')}, Doer!</h1>
        <p className="text-white/90 mb-4">
          Find tasks that match your skills and start earning today.
        </p>
        <Button className="bg-white text-primary hover:bg-white/90 rounded-2xl">
          <Search className="h-4 w-4 mr-2" />
          {t('browseAllTasks')}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Available Tasks */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Tasks</span>
              <Button variant="outline" size="sm" className="rounded-xl">
                Browse All
              </Button>
            </CardTitle>
            <CardDescription>
              New tasks matching your skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <span className="text-lg font-bold text-primary">{task.budget}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                    <span>{task.category}</span>
                    <span>•</span>
                    <span>{task.deadline}</span>
                    <span>•</span>
                    <span>{task.client}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {task.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <Button size="sm" className="w-full rounded-xl">
                    Apply Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Gigs */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('myGigs')}</CardTitle>
            <CardDescription>
              Your current active projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myGigs.map((gig) => (
                <div
                  key={gig.id}
                  className="p-4 bg-muted/50 rounded-2xl"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{gig.title}</h3>
                    <span className="text-lg font-bold text-primary">{gig.budget}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-3">
                    <span>{gig.client}</span>
                    <span>•</span>
                    <span>{gig.deadline}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Progress</span>
                    <span className="text-sm font-medium">{gig.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${gig.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        gig.status === 'In Progress'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-accent/10 text-accent'
                      }`}
                    >
                      {gig.status}
                    </span>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoerDashboard;