import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseOAuthError } from '@/lib/oauthErrors';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Detect OAuth errors returned in the URL (query or hash fragment)
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const errParam = search.get('error') || hash.get('error');
        const errDesc = search.get('error_description') || hash.get('error_description');
        if (errParam) {
          const parsed = parseOAuthError(errDesc || errParam);
          navigate('/auth', { replace: true, state: { oauthError: parsed } });
          return;
        }

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
          // New OAuth user — create profile using pending role from localStorage
          const pendingRole = (localStorage.getItem('pending_oauth_role') as 'client' | 'doer') || 'client';
          localStorage.removeItem('pending_oauth_role');

          const meta = session.user.user_metadata || {};
          const fullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'User';

          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_user_id: session.user.id,
              name: fullName,
              email: session.user.email!,
              photo_url: meta.avatar_url || meta.picture || null,
              role: pendingRole,
              active_role: pendingRole,
              language: 'en',
            });

          if (insertError) throw insertError;

          navigate(pendingRole === 'doer' ? '/onboarding/expert' : '/onboarding/client');
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Authentication Error</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <p className="text-muted-foreground text-sm mb-4">Redirecting to login...</p>
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
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
