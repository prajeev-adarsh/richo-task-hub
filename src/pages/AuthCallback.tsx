import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          throw new Error('No session found');
        }

        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id, active_role, onboarding_completed')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (existingProfile) {
          // Existing user - redirect based on role
          if (!existingProfile.onboarding_completed) {
            if (existingProfile.active_role === 'doer') {
              navigate('/onboarding/expert');
            } else {
              navigate('/onboarding/client');
            }
          } else {
            if (existingProfile.active_role === 'client') {
              navigate('/client-dashboard');
            } else if (existingProfile.active_role === 'doer') {
              navigate('/doer-dashboard');
            } else if (existingProfile.active_role === 'admin') {
              navigate('/admin-dashboard');
            } else {
              navigate('/');
            }
          }
        } else {
          // New user - create profile
          const pendingRole = localStorage.getItem('pending_oauth_role') as 'client' | 'doer' | null;
          const role = pendingRole || 'client';
          localStorage.removeItem('pending_oauth_role');

          // Get user metadata from OAuth provider
          const userEmail = session.user.email || '';
          const userName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          userEmail.split('@')[0];

          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              auth_user_id: session.user.id,
              name: userName,
              email: userEmail.toLowerCase(),
              role: role,
              active_role: role,
              photo_url: session.user.user_metadata?.avatar_url || null,
            });

          if (profileError) {
            logger.error('Profile creation error:', profileError);
            throw profileError;
          }

          // Add role to user_roles table
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: session.user.id,
              role: role,
            });

          if (roleError) {
            logger.error('Role creation error:', roleError);
            // Don't throw - profile was created successfully
          }

          // Redirect to onboarding
          if (role === 'doer') {
            navigate('/onboarding/expert');
          } else {
            navigate('/onboarding/client');
          }
        }
      } catch (err: any) {
        logger.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-2">Authentication Error</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <p className="text-muted-foreground text-sm mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
