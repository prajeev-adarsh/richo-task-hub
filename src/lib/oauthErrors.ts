/**
 * Parses Supabase / Google OAuth errors into friendly, actionable content.
 */

export type OAuthErrorKind =
  | 'provider_not_enabled'
  | 'redirect_mismatch'
  | 'user_cancelled'
  | 'network'
  | 'unknown';

export interface ParsedOAuthError {
  kind: OAuthErrorKind;
  title: string;
  description: string;
  /** Wizard step to deep-link into when user clicks the CTA (1-5). */
  wizardStep?: number;
  /** If true, render silently (no alert/toast). */
  silent?: boolean;
}

export function parseOAuthError(input: unknown): ParsedOAuthError {
  const raw =
    typeof input === 'string'
      ? input
      : input && typeof input === 'object'
      ? ((input as any).message || (input as any).error_description || (input as any).error || '')
      : '';
  const msg = String(raw).toLowerCase();

  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider')) {
    return {
      kind: 'provider_not_enabled',
      title: "Google sign-in isn't turned on yet",
      description:
        'The Google provider needs to be enabled in Supabase. Follow the 5-step setup wizard to fix it in a few minutes.',
      wizardStep: 3,
    };
  }

  if (
    msg.includes('redirect_uri_mismatch') ||
    msg.includes('requested path is invalid') ||
    msg.includes('redirect url') ||
    msg.includes('redirect_uri')
  ) {
    return {
      kind: 'redirect_mismatch',
      title: 'Redirect URL not configured',
      description:
        "Google or Supabase rejected the redirect URL. Open the setup wizard to add the correct URLs.",
      wizardStep: 4,
    };
  }

  if (
    msg.includes('popup_closed') ||
    msg.includes('user closed') ||
    msg.includes('access_denied') ||
    msg.includes('cancelled') ||
    msg.includes('canceled')
  ) {
    return {
      kind: 'user_cancelled',
      title: 'Sign-in cancelled',
      description: 'You closed the Google sign-in window. Try again whenever you’re ready.',
      silent: true,
    };
  }

  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return {
      kind: 'network',
      title: 'Network error',
      description: 'Could not reach the authentication server. Check your connection and try again.',
    };
  }

  return {
    kind: 'unknown',
    title: 'Sign-in failed',
    description: raw ? String(raw) : 'Something went wrong with Google sign-in. Please try again.',
  };
}

/** Dispatch a global event to open the Google setup wizard at an optional step. */
export function openGoogleSetupWizard(step?: number) {
  window.dispatchEvent(
    new CustomEvent('open-google-setup-wizard', { detail: { step: step ?? 1 } }),
  );
}
