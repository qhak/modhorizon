# Managed accounts setup

ModHorizon uses Supabase Auth for email/password and Google sign-in. Passwords are never stored in Cloudflare D1. D1 keeps a unique verified auth subject on the existing billing account. Signing into another account never merges balances. A guest must confirm their account in the same browser to retain its balance.

Configure Cloudflare runtime variables (and `.dev.vars` for local development):

```
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
APP_ORIGIN=https://modhorizon.callout-ai.workers.dev
AUTH_GOOGLE_ENABLED=false
```

Use a publishable key, never a Supabase service-role/secret key. Apply D1 migration `0004_account_identity.sql` after earlier migrations. No application tables or policies are created in Supabase.

In Supabase Auth:

1. Enable email/password and **Confirm email**. Set minimum password length to 12. Configure auth rate limits and production CAPTCHA/bot protection when enabling public signup. The app enforces same-origin POSTs and generic recovery/signup responses.
2. Set Site URL to the app origin, and add the exact `https://modhorizon.callout-ai.workers.dev/auth/callback` and `https://modhorizon.callout-ai.workers.dev/auth/callback?next=reset` URLs to the redirect allowlist. Use corresponding localhost callback URLs for local development only. PKCE links must be opened in the browser that initiated signup/recovery.
3. Configure custom SMTP with a verified sending domain before public email signup. The default Supabase mail service is restricted and is unsuitable for public production email delivery. Keep default confirmation/reset link templates using the provider verification link so PKCE exchanges return a `code` to `/auth/callback`.
4. Create a Google OAuth Web client, configure consent screen/authorized audience, and copy its ID/secret into Supabase's Google provider settings. Google's authorized redirect URI is `https://PROJECT.supabase.co/auth/v1/callback` (Supabase), not the ModHorizon callback. Enable Google in Supabase, then set `AUTH_GOOGLE_ENABLED=true`.

Production acceptance: sign up → receive email → confirm in same browser → verify original guest credits; sign out → sign in from a different browser → same account/credits; request reset → update password → old password fails; Google sign-in → same billing identity on return. Test subscription portal and top-up ownership after login. External credentials/configuration are required before these can be exercised end to end.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Rollout (22 October 2026): production auth runtime values and Google provider are configured; remote migrations applied and accounts/top-ups deployed. The owner reached Google's account chooser. Custom SMTP and completed sign-in/payment acceptance remain outstanding. See accounts-and-topups.md for verification status.
