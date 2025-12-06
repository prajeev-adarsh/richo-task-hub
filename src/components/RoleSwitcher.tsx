import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/components/UserContext';
import { Briefcase, UserCircle, Shield, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';

const RoleSwitcher = () => {
  const { user, role } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAvailableRoles();
    }
  }, [user]);

  const fetchAvailableRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_roles', { _user_id: user.auth_user_id });

      if (error) throw error;

      setAvailableRoles(data?.map((r: any) => r.role) || []);
    } catch (error) {
      logger.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available roles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === role) return;

    setIsSwitching(true);

    try {
      const { error } = await supabase
        .rpc('switch_user_role', { _new_role: newRole });

      if (error) throw error;

      toast({
        title: "Role switched",
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
        title: "Error",
        description: error.message || "Failed to switch role",
        variant: "destructive",
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

  const getRoleColor = (roleType: UserRole) => {
    switch (roleType) {
      case 'admin':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'client':
        return 'bg-primary/10 text-primary hover:bg-primary/20';
      case 'doer':
        return 'bg-accent/10 text-accent-foreground hover:bg-accent/20';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (availableRoles.length <= 1) {
    return (
      <div className="text-sm text-muted-foreground">
        You currently have only one role. Contact support to add more roles.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {availableRoles.map((roleOption) => {
          const isActive = roleOption === role;
          
          return (
            <Button
              key={roleOption}
              variant={isActive ? "default" : "outline"}
              size="lg"
              className={`flex items-center gap-2 ${!isActive && getRoleColor(roleOption)}`}
              onClick={() => handleRoleSwitch(roleOption)}
              disabled={isActive || isSwitching}
            >
              {getRoleIcon(roleOption)}
              <span className="font-medium capitalize">{roleOption}</span>
              {isActive && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
      
      {availableRoles.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Switch between your roles to access different dashboards and features. Your data and settings remain the same.
        </p>
      )}
    </div>
  );
};

export default RoleSwitcher;
