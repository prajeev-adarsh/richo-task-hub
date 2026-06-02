
## Goal

Make Google Sign-In failures self-explanatory and give you a guided, in-app wizard that walks through the exact Supabase + Google Cloud steps — with deep links to the right dashboard pages and the exact redirect URL to paste.

## 1. Friendly OAuth error handling

**Where:** `src/components/auth/GoogleAuthButton.tsx` + a new `src/lib/oauthErrors.ts`.

- Add an error parser that maps Supabase auth errors to friendly content:
  - `provider is not enabled` → "Google sign-in isn't turned on yet" + CTA "Open setup wizard".
  - `redirect_uri_mismatch` / `requested path is invalid` → "Redirect URL not configured" + CTA "Open setup wizard" (jump to redirect step).
  - `popup_closed` / user-cancelled → silent or soft toast, no scary red.
  - Network/unknown → generic retry message.
- Replace the current red destructive toast with an inline `Alert` under the Google button showing: title, one-line explanation, and a primary action button that opens the wizard at the relevant step.
- Also detect error params on `/auth/callback` (`?error=...&error_description=...`) and route back to `/auth` with the same friendly alert pre-populated (via location state).

## 2. In-app Google Sign-In Setup Wizard

**New file:** `src/components/auth/GoogleSetupWizard.tsx` — a `Dialog` with a `Progress` bar and 5 steps. Opened from:
- The friendly error alert's CTA.
- A small "Set up Google Sign-In" link under the Google button (only shown to admins, or always — see open question).

**Steps (each with copy-to-clipboard for values + deep links):**

1. **Create Google Cloud OAuth client**
   - Link → Google Cloud Credentials console.
   - Instructions: create OAuth client ID, type = Web application.
   - Show the values to paste:
     - Authorized JavaScript origin: `https://richo.lovable.app` (and current preview origin).
     - Authorized redirect URI: `https://kcayjxyycbpnjilfgtet.supabase.co/auth/v1/callback` (Supabase callback, copied from project ref).
2. **Configure OAuth consent screen**
   - Link → Consent Screen page.
   - Add authorized domain: `kcayjxyycbpnjilfgtet.supabase.co`.
   - Scopes: `openid`, `userinfo.email`, `userinfo.profile`.
3. **Enable Google provider in Supabase**
   - Link → `https://supabase.com/dashboard/project/kcayjxyycbpnjilfgtet/auth/providers`.
   - Paste Client ID + Client Secret from step 1, toggle Enabled.
4. **Configure Supabase URL settings**
   - Link → `https://supabase.com/dashboard/project/kcayjxyycbpnjilfgtet/auth/url-configuration`.
   - Site URL: `https://richo.lovable.app`.
   - Additional redirect URLs: `https://richo.lovable.app/auth/callback`, current Lovable preview `/auth/callback`.
5. **Test it**
   - "Run test sign-in" button → calls `supabase.auth.signInWithOAuth({ provider: 'google' })` in a popup-style flow and reports back success / which step likely failed based on returned error code.
   - On success: confetti + close.

**UX details:**
- Each step has Next/Back, a "Mark step done" checkbox (persisted in `localStorage` so progress survives reloads), and a "Copy all values" button.
- Wizard can be opened standalone via route `?setup=google` on `/auth` so links from the error alert deep-link to a specific step (`?setup=google&step=3`).
- Uses existing semantic tokens (electric cyan/neon purple accents, dark surfaces) — no new colors.

## 3. Small supporting changes

- `src/pages/Auth.tsx`: read `?setup=google&step=N` and mount `<GoogleSetupWizard />`; render friendly error alert from `location.state.oauthError`.
- `src/pages/AuthCallback.tsx`: forward `error`/`error_description` query params back to `/auth` via `navigate('/auth', { state: { oauthError } })` instead of generic toast.

## Out of scope (intentionally)

- Actually enabling the Google provider via API — Supabase doesn't expose a public API for this on managed projects, so the wizard guides you rather than automating it. (Confirmed in earlier turn.)
- Changing the OAuth callback business logic (auto-creating users, role routing) — already working.

## Open questions

1. Should the "Set up Google Sign-In" entry point be visible to **everyone** on `/auth`, or **only to admins** (checked via `has_role`)? Showing to everyone is simpler and matches the current state where the button is broken for all users; admin-only is cleaner once it's working.
2. Want the wizard reachable from a dedicated admin page too (e.g. `/admin/integrations/google`), or only from the auth page?
