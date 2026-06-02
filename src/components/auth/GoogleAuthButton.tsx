import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { openGoogleSetupWizard, parseOAuthError, type ParsedOAuthError } from '@/lib/oauthErrors';

interface GoogleAuthButtonProps {
  mode: 'login' | 'signup';
  role?: 'client' | 'doer';
  className?: string;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ mode, role, className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ParsedOAuthError | null>(null);
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (role) localStorage.setItem('pending_oauth_role', role);

      // Get the OAuth URL without redirecting so we can pre-flight-check it.
      // Supabase otherwise redirects the browser straight to /authorize, where
      // a misconfigured provider returns a raw JSON 400 page (bad UX).
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;
      if (!data?.url) throw new Error('No OAuth URL returned');

      // Pre-flight: HEAD/GET the authorize URL. If the provider isn't enabled
      // or redirect URLs are wrong, Supabase returns a JSON error instead of
      // a 302 to Google. fetch() with redirect: 'manual' won't follow the 302.
      try {
        const res = await fetch(data.url, { method: 'GET', redirect: 'manual' });
        // A successful authorize returns an opaqueredirect (status 0) or 3xx.
        // Errors return 4xx with JSON body.
        if (res.type !== 'opaqueredirect' && res.status >= 400) {
          let bodyMsg = '';
          try {
            const body = await res.json();
            bodyMsg = body.msg || body.error_description || body.error || '';
          } catch {
            /* ignore */
          }
          throw new Error(bodyMsg || `OAuth provider returned ${res.status}`);
        }
      } catch (preflightErr: any) {
        // Network/CORS failures here are non-fatal: fall through to redirect.
        if (preflightErr?.message && /provider|redirect|enabled|invalid/i.test(preflightErr.message)) {
          throw preflightErr;
        }
      }

      // All good — redirect the browser to start the real OAuth flow.
      window.location.href = data.url;
    } catch (err: any) {
      logger.error('Google auth error:', err);
      const parsed = parseOAuthError(err);
      if (parsed.silent) {
        toast({ title: parsed.title, description: parsed.description });
      } else {
        setError(parsed);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className={`w-full rounded-2xl flex items-center justify-center gap-3 ${className ?? ''}`}
        onClick={handleGoogleAuth}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
      </Button>

      {error && !error.silent && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error.description}</p>
            {error.wizardStep !== undefined && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => openGoogleSetupWizard(error.wizardStep)}
              >
                <Settings2 className="h-3.5 w-3.5 mr-2" />
                Open setup wizard
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <button
        type="button"
        onClick={() => openGoogleSetupWizard(1)}
        className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline w-full text-center"
      >
        Need to set up Google Sign-In?
      </button>
    </div>
  );
};

export default GoogleAuthButton;
