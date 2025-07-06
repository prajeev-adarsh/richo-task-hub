import React from 'react';
import { useLanguage } from './LanguageContext';
import { useUser, UserRole } from './UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Search, Shield } from 'lucide-react';

const RoleSelector = () => {
  const { t } = useLanguage();
  const { setUser } = useUser();

  const handleRoleSelect = (role: UserRole) => {
    // Simulate user login - in real app this would be handled by authentication
    const mockUser = {
      id: '1',
      name: 'Demo User',
      email: 'demo@richo.com',
      role: role!,
    };
    setUser(mockUser);
  };

  const roles = [
    {
      role: 'client' as UserRole,
      icon: PlusCircle,
      title: t('client'),
      description: t('clientTagline'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      role: 'doer' as UserRole,
      icon: Search,
      title: t('doer'),
      description: t('doerTagline'),
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      role: 'admin' as UserRole,
      icon: Shield,
      title: t('admin'),
      description: 'Manage platform and users',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <h1 className="text-4xl font-bold text-gradient">Richo</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2">{t('tagline')}</p>
          <p className="text-foreground">{t('welcome')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((roleOption) => {
            const IconComponent = roleOption.icon;
            return (
              <Card
                key={roleOption.role}
                className="cursor-pointer hover:shadow-card transition-all duration-300 border-2 hover:border-primary/20 rounded-2xl"
                onClick={() => handleRoleSelect(roleOption.role)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 ${roleOption.bgColor} rounded-2xl mx-auto mb-4 flex items-center justify-center`}>
                    <IconComponent className={`h-8 w-8 ${roleOption.color}`} />
                  </div>
                  <CardTitle className="text-xl">{roleOption.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {roleOption.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    className="w-full rounded-2xl" 
                    variant={roleOption.role === 'client' ? 'default' : roleOption.role === 'doer' ? 'secondary' : 'outline'}
                  >
                    {t('getStarted')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;