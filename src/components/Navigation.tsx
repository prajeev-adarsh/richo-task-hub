import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, UserRole } from './UserContext';
import { useLanguage, Language } from './LanguageContext';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  PlusCircle, 
  CheckSquare, 
  Search, 
  Briefcase, 
  CreditCard, 
  DollarSign, 
  User, 
  Users, 
  BarChart3,
  Globe,
  ChevronDown,
  Shield,
  UserCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from './notifications/NotificationBell';

const Navigation = () => {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, signOut } = useUser();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchAvailableRoles = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_roles', { _user_id: user.auth_user_id });

      if (error) throw error;
      setAvailableRoles(data?.map((r: any) => r.role) || []);
    } catch (error) {
      logger.error('Error fetching roles:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchAvailableRoles();
  }, [fetchAvailableRoles]);

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === role) return;

    setIsSwitching(true);

    try {
      const { error } = await supabase
        .rpc('switch_user_role', { _new_role: newRole });

      if (error) throw error;

      toast({
        title: 'Role switched',
        description: `You are now viewing as ${newRole}`,
      });

      // Redirect to appropriate dashboard
      switch (newRole) {
        case 'client':
          navigate('/client-dashboard');
          break;
        case 'doer':
          navigate('/doer-dashboard');
          break;
        case 'admin':
          navigate('/admin-dashboard');
          break;
      }

      // Refresh the page to update context
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      logger.error('Error switching role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to switch role',
        variant: 'destructive',
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const getRoleIcon = (roleType: UserRole) => {
    switch (roleType) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'client':
        return <Briefcase className="h-4 w-4" />;
      case 'doer':
        return <UserCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!isAuthenticated) return null;

  const getNavItems = () => {
    switch (role) {
      case 'client':
        return [
          { icon: Home, label: t('home'), path: '/client-dashboard' },
          { icon: PlusCircle, label: t('postTask'), path: '/post-task' },
          { icon: CheckSquare, label: t('myTasks'), path: '/my-tasks' },
          { icon: CreditCard, label: t('payments'), path: '/payments' },
          { icon: User, label: t('profile'), path: '/profile' },
        ];
      case 'doer':
        return [
          { icon: Home, label: t('home'), path: '/doer-dashboard' },
          { icon: Search, label: t('browseTasks'), path: '/browse-tasks' },
          { icon: Briefcase, label: t('myGigs'), path: '/my-gigs' },
          { icon: DollarSign, label: t('earnings'), path: '/earnings' },
          { icon: User, label: t('profile'), path: '/profile' },
        ];
      case 'admin':
        return [
          { icon: BarChart3, label: t('dashboard'), path: '/admin' },
          { icon: Users, label: t('users'), path: '/admin/users' },
          { icon: CheckSquare, label: t('tasks'), path: '/admin/tasks' },
          { icon: BarChart3, label: t('reports'), path: '/admin/reports' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-card border-b shadow-soft">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold text-gradient">Richo</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                className="flex items-center space-x-2 px-3 py-2 rounded-2xl hover:bg-muted"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>

          {/* Role Switcher, Language Selector & User Menu */}
          <div className="flex items-center space-x-2">
            {/* Role Switcher Dropdown */}
            {availableRoles.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={isSwitching}
                  >
                    {getRoleIcon(role)}
                    <span className="capitalize hidden sm:inline">{role}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                  <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableRoles.map((roleOption) => {
                    const isActive = roleOption === role;
                    return (
                      <DropdownMenuItem
                        key={roleOption}
                        onClick={() => handleRoleSwitch(roleOption)}
                        disabled={isActive || isSwitching}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(roleOption)}
                          <span className="capitalize">{roleOption}</span>
                        </div>
                        {isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              onClick={() => {
                const languages: Language[] = ['en', 'te', 'hi'];
                const currentIndex = languages.indexOf(language);
                const nextIndex = (currentIndex + 1) % languages.length;
                setLanguage(languages[nextIndex]);
              }}
            >
              <Globe className="h-4 w-4" />
              <span className="uppercase">{language}</span>
            </Button>

            <NotificationBell />

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/profile')}
            >
              <User className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => signOut()}
              className="text-destructive hover:text-destructive"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 px-3 py-2 rounded-2xl hover:bg-muted whitespace-nowrap"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;