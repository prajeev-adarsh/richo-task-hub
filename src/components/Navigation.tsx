import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { useLanguage, Language } from './LanguageContext';
import { Button } from '@/components/ui/button';
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
  Globe
} from 'lucide-react';

const Navigation = () => {
  const navigate = useNavigate();
  const { role, isAuthenticated, signOut } = useUser();
  const { t, language, setLanguage } = useLanguage();

  if (!isAuthenticated) return null;

  const getNavItems = () => {
    switch (role) {
      case 'client':
        return [
          { icon: Home, label: t('home'), path: '/' },
          { icon: PlusCircle, label: t('postTask'), path: '/post-task' },
          { icon: CheckSquare, label: t('myTasks'), path: '/my-tasks' },
          { icon: CreditCard, label: t('payments'), path: '/payments' },
          { icon: User, label: t('profile'), path: '/profile' },
        ];
      case 'doer':
        return [
          { icon: Home, label: t('home'), path: '/' },
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

          {/* Language Selector & User Menu */}
          <div className="flex items-center space-x-2">
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

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {/* Open user menu */}}
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