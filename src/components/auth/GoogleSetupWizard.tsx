import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Copy, ExternalLink, Loader2, AlertCircle, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseOAuthError } from '@/lib/oauthErrors';
import { logger } from '@/lib/logger';

const SUPABASE_PROJECT_REF = 'kcayjxyycbpnjilfgtet';
const SUPABASE_CALLBACK_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback`;
const PUBLISHED_ORIGIN = 'https://richo.lovable.app';
const PROGRESS_KEY = 'google_setup_wizard_progress_v1';

interface CopyValue {
  label: string;
  value: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  link: { label: string; url: string };
  copyValues: CopyValue[];
  bullets: string[];
}

const buildSteps = (previewOrigin: string): Step[] => [
  {
    id: 1,
    title: 'Create a Google OAuth client',
    description:
      'In Google Cloud, create an OAuth 2.0 Client ID of type "Web application". You’ll paste the resulting Client ID and Secret into Supabase in step 3.',
    link: {
      label: 'Open Google Cloud Credentials',
      url: 'https://console.cloud.google.com/apis/credentials',
    },
    copyValues: [
      { label: 'Authorized JavaScript origin (production)', value: PUBLISHED_ORIGIN },
      { label: 'Authorized JavaScript origin (preview)', value: previewOrigin },
      { label: 'Authorized redirect URI', value: SUPABASE_CALLBACK_URL },
    ],
    bullets: [
      'Click "Create credentials" → "OAuth client ID".',
      'Application type: Web application.',
      'Add the JavaScript origins and the redirect URI above.',
      'Save the Client ID and Client Secret — you need them in step 3.',
    ],
  },
  {
    id: 2,
    title: 'Configure the OAuth consent screen',
    description:
      'Google requires a consent screen before users can sign in. Add Supabase as an authorized domain and request basic profile scopes.',
    link: {
      label: 'Open OAuth Consent Screen',
      url: 'https://console.cloud.google.com/apis/credentials/consent',
    },
    copyValues: [
      { label: 'Authorized domain', value: `${SUPABASE_PROJECT_REF}.supabase.co` },
      { label: 'Scope', value: 'openid' },
      { label: 'Scope', value: '.../auth/userinfo.email' },
      { label: 'Scope', value: '.../auth/userinfo.profile' },
    ],
    bullets: [
      'User type: External (unless you use Google Workspace).',
      'Add the authorized domain above.',
      'Add the three scopes above (they are non-sensitive).',
    ],
  },
  {
    id: 3,
    title: 'Enable Google in Supabase',
    description:
      'Open the Supabase Auth Providers page, toggle Google on, and paste the Client ID + Secret from step 1.',
    link: {
      label: 'Open Supabase Auth Providers',
      url: `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`,
    },
    copyValues: [
      { label: 'Callback URL (already set in Google)', value: SUPABASE_CALLBACK_URL },
    ],
    bullets: [
      'Find "Google" in the provider list and expand it.',
      'Toggle "Enable Sign in with Google" ON.',
      'Paste your Client ID and Client Secret, then Save.',
    ],
  },
  {
    id: 4,
    title: 'Configure Supabase URLs',
    description:
      'Tell Supabase which URLs are allowed for redirects after sign-in. Missing this causes "requested path is invalid" errors.',
    link: {
      label: 'Open Supabase URL Configuration',
      url: `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/url-configuration`,
    },
    copyValues: [
      { label: 'Site URL', value: PUBLISHED_ORIGIN },
      { label: 'Additional redirect URL (production)', value: `${PUBLISHED_ORIGIN}/auth/callback` },
      { label: 'Additional redirect URL (preview)', value: `${previewOrigin}/auth/callback` },
    ],
    bullets: [
      'Set Site URL to the production URL above.',
      'Add both /auth/callback URLs to "Redirect URLs".',
      'Save changes.',
    ],
  },
  {
    id: 5,
    title: 'Test it',
    description:
      'Run a real Google sign-in flow. If anything is still misconfigured, we’ll tell you exactly which step to fix.',
    link: { label: '', url: '' },
    copyValues: [],
    bullets: [
      'Click "Run test sign-in" below.',
      'A Google account picker should appear.',
      'If you see an error, we’ll guide you back to the right step.',
    ],
  },
];

interface GoogleSetupWizardProps {
  /** When true, the dialog is forced open. Otherwise it listens for the global event + ?setup=google. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialStep?: number;
}

const GoogleSetupWizard: React.FC<GoogleSetupWizardProps> = ({ open: controlledOpen, onOpenChange, initialStep }) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(initialStep ?? 1);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; fixStep?: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const previewOrigin = useMemo(() => window.location.origin, []);
  const steps = useMemo(() => buildSteps(previewOrigin), [previewOrigin]);

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
    if (!next) {
      // Clean wizard params from URL
      if (searchParams.get('setup')) {
        searchParams.delete('setup');
        searchParams.delete('step');
        setSearchParams(searchParams, { replace: true });
      }
    }
  };

  // Load saved progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) setCompleted(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist progress
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));
    } catch {
      /* ignore */
    }
  }, [completed]);

  // Open via URL param
  useEffect(() => {
    if (searchParams.get('setup') === 'google') {
      const s = Number(searchParams.get('step') || '1');
      setStep(Math.min(Math.max(s, 1), steps.length));
      if (controlledOpen === undefined) setInternalOpen(true);
    }
  }, [searchParams, controlledOpen, steps.length]);

  // Open via global event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const s = Number(detail.step || 1);
      setStep(Math.min(Math.max(s, 1), steps.length));
      setTestResult(null);
      if (controlledOpen === undefined) setInternalOpen(true);
    };
    window.addEventListener('open-google-setup-wizard', handler);
    return () => window.removeEventListener('open-google-setup-wizard', handler);
  }, [controlledOpen, steps.length]);

  const current = steps[step - 1];
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch (err) {
      logger.error('Clipboard write failed', err);
      toast({ title: 'Could not copy', description: 'Copy the value manually.', variant: 'destructive' });
    }
  };

  const copyAll = async () => {
    const text = current.copyValues.map((v) => `${v.label}: ${v.value}`).join('\n');
    await copy(`all-${current.id}`, text);
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // On success the browser is redirected, so this block usually won't run.
      setTestResult({ ok: true, message: 'Redirecting to Google…' });
    } catch (err: any) {
      const parsed = parseOAuthError(err);
      setTestResult({ ok: false, message: `${parsed.title} — ${parsed.description}`, fixStep: parsed.wizardStep });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Google Sign-In Setup Wizard</DialogTitle>
          <DialogDescription>
            5 steps to enable Google sign-in. Values are pre-filled for this project — just copy and paste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of {steps.length}</span>
            <span>{completedCount} of {steps.length} marked done</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => { setStep(s.id); setTestResult(null); }}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                step === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : completed[s.id]
                  ? 'border-primary/40 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {completed[s.id] ? <Check className="inline h-3 w-3 mr-1" /> : null}
              {s.id}. {s.title.split(' ').slice(0, 3).join(' ')}
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-xl border border-border p-4 bg-card/50">
          <div>
            <h3 className="text-base font-semibold">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
          </div>

          {current.link.url ? (
            <Button asChild variant="outline" className="rounded-2xl">
              <a href={current.link.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {current.link.label}
              </a>
            </Button>
          ) : null}

          {current.bullets.length > 0 && (
            <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
              {current.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}

          {current.copyValues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Values to paste</span>
                <Button type="button" variant="ghost" size="sm" onClick={copyAll}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy all
                </Button>
              </div>
              {current.copyValues.map((v, i) => {
                const key = `${current.id}-${i}`;
                return (
                  <div key={key} className="space-y-1">
                    <div className="text-xs text-muted-foreground">{v.label}</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all">{v.value}</code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copy(key, v.value)}
                        className="shrink-0"
                      >
                        {copiedKey === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {current.id === 5 && (
            <div className="space-y-3">
              <Button onClick={runTest} disabled={testing} className="rounded-2xl">
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PartyPopper className="h-4 w-4 mr-2" />}
                {testing ? 'Testing…' : 'Run test sign-in'}
              </Button>
              {testResult && (
                <Alert variant={testResult.ok ? 'default' : 'destructive'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{testResult.ok ? 'Looks good' : 'Still not working'}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{testResult.message}</p>
                    {!testResult.ok && testResult.fixStep && (
                      <Button size="sm" variant="outline" onClick={() => { setStep(testResult.fixStep!); setTestResult(null); }}>
                        Go to step {testResult.fixStep}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
            <Checkbox
              checked={!!completed[current.id]}
              onCheckedChange={(c) => setCompleted((prev) => ({ ...prev, [current.id]: !!c }))}
            />
            <span>Mark step {current.id} as done</span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => { setStep((s) => Math.max(1, s - 1)); setTestResult(null); }}
            className="rounded-2xl"
          >
            Back
          </Button>
          {step < steps.length ? (
            <Button
              onClick={() => { setStep((s) => Math.min(steps.length, s + 1)); setTestResult(null); }}
              className="rounded-2xl"
            >
              Next
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)} className="rounded-2xl">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSetupWizard;
