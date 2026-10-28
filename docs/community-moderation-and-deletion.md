# Community moderation and account deletion — v0.19.0

## Current status

Implemented and checked locally on 26 October 2026. This is a feature-branch release, not a production rollout. No real account was deleted and no live Stripe subscription was canceled during validation. The destructive provider calls were replaced by fixtures/mocked network responses in tests.

The local preview keeps self-service deletion disabled. Previously temporary moderator access was removed and has not been re-enabled for this release.

## Moderation

- Visitors can open profile/comment report forms; submitting requires a confirmed account with an active creator profile. Reasons accept 10–1,000 characters. Open duplicate reports are deduplicated and report writes share the existing account rate limit.
- The existing moderator page now includes a searchable profile/comment queue, unresolved reports, optional action notes, hide/restore controls and report dismissal. Access uses the trusted server `COMMUNITY_MODERATOR_IDS` allowlist, never a client-supplied role.
- Hiding a profile removes its public profile, showcases, comments and attached screenshot access. Its owner can see the restriction but cannot edit, upload or participate until restored. Hiding a comment leaves its parent showcase intact.
- Actions write an audit record in the same D1 transaction. Profile actions compare the reviewed update timestamp so stale actions are rejected. An account deletion marker also removes public content while deletion is pending.
- Public moderation is removal from app responses, not a promise to erase screenshots already downloaded or third-party search caches. Previously approved post moderation remains a separate queue.

## Deletion setup

Apply D1 migrations **0007** and **0008** before running this version. The local migrations have been applied; remote migrations have not.

Configure server-only runtime values through Worker secrets/environment configuration:

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | The project's existing HTTPS auth endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Existing account sign-in configuration |
| `SUPABASE_SECRET_KEY` | Modern `sb_secret_…` admin key, exclusively server-side |
| `ACCOUNT_DELETION_ENABLED=true` | Explicit enable switch; absent defaults to off |
| `ALLOW_LOCAL_ACCOUNT_DELETION=true` | Additional development-mode switch for disposable staging fixtures only |
| `STRIPE_SECRET_KEY` | Valid matching-mode secret with checkout/subscription permissions whenever a billing account exists |

Never expose the admin key as `NEXT_PUBLIC_…`, commit it, paste it into screenshots, or reuse production users for destructive local tests. Leave deletion disabled until the disposable staging acceptance below is complete. `.dev.vars.example` contains names only.

The account page links to `/account/delete`. The form requires typing `DELETE`, acknowledging removal/billing consequences, and a verified sign-in within ten minutes. A token refresh alone is insufficient: the server verifies the token's authentication-method timestamp and subject/session after asking Supabase for the confirmed user. Old sessions must sign out and sign back in.

## Deletion sequence and retained data

1. Reject while the account has a held generation reservation. Otherwise atomically record a durable pending deletion marker and block new credit holds, billing sessions, app access and late community writes. Public content becomes unavailable immediately.
2. Expire open Stripe checkout sessions linked to the server-owned billing account. Cancel stored subscriptions and matching subscription metadata, including subscriptions whose completion webhook has not reached D1. Ownership and cancellation responses are checked; redirects/timeouts/failures stop progress. Each list is bounded to 20 pages of 100; exhaustion needs operator investigation rather than assuming cancellation succeeded.
3. Revoke refresh sessions, atomically remove owned community data and app billing sessions, remove the current process's generated artifacts, then delete the auth user. Finish the deletion marker only after success.
4. The pending/complete marker denies stale access tokens at app boundaries. Artifact downloads check durable billing deletion state even if bytes remain in another worker's memory; those cache entries otherwise expire after 30 minutes. Legacy artifacts without owner attribution are unavailable and must be regenerated.

Removal includes profiles, showcases, screenshots, comments, likes, follows, account activity, related community reports, and associated app billing sessions. Other users' unrelated work remains. Comments/likes/reports attached to a removed showcase are also removed.

Retained data: a minimal auth-ID deletion marker and disconnected financial records (including Stripe references, event receipts, purchase/credit history). The billing row loses its email, is disconnected from normal sign-in, and has zero balances/free canceled status. Stripe customer/payment history is not deleted. No automatic refund is issued; remaining paid time and unused credits are forfeited as disclosed before submission. A retention schedule/legal policy still needs to be set before launch.

Downloaded files, browser-local drafts and the separate local development project library are not removed by this account flow. The development library is not a per-user cloud project store. Do not expose that local development feature as shared production storage without a separate ownership/storage review.

Delayed, signed Stripe events for a deleting/deleted account trigger billing cleanup before acknowledgement, without restoring entitlements. Credit-grant SQL also checks deletion state to cover an overlapping local transaction. Keep the webhook configured after deletion. Failed cancellation remains retryable; a payment that completed concurrently can require manual billing/refund review.

## Failure recovery

There is no automatic background deletion worker in this release. A failed stage returns an error and leaves a pending marker. Sign in again to the same account, go directly to `/account/delete`, confirm and retry. Normal app access stays blocked. Local cleanup is atomic and retries are idempotent; completed core retries do not repeat external effects.

If auth deletion succeeds but the final D1 completion write fails, the user cannot sign in to retry. An operator must verify auth removal, local purge and billing cancellation, then reconcile that marker. Do not delete the marker or restore access to work around a failure. Likewise, stuck held generation reservations need verified settlement/recovery before deletion; do not drop a hold blindly.

## Validation and remaining acceptance

- 221 automated tests pass; TypeScript passes. Coverage includes public/owner isolation, profile/comment hide/restore, real screenshot visibility, report deduplication/dismissal, stale moderation, owned-only purge, atomic rollback, fresh authentication claims, billing/service failure retries, generation hold guards, late writes, late billing events, checkout races, and durable artifact denial.
- Local browser: profile report form opens in the current design; the signed-in deletion page loads with disabled controls and a clear configuration message. Anonymous deletion/moderation endpoints return 401; cross-origin deletion returns 403. No real deletion or role expansion was performed.
- Production build result is recorded in the release changelog. Production D1 migration, deployment, permanent moderator setup, and a disposable **separate staging Supabase/Stripe test-mode** end-to-end run remain outstanding.
- Staging acceptance must cover password and Google recent sign-in, real provider revocation/removal, subscriptions plus open checkout expiration, failed/retried cancellation, two-device stale-token denial, private/public content removal, and absence of unrelated-account changes. Keep production enable off until accepted.

## Provider references

Checked 26 October 2026: [Supabase admin user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [Supabase sign-out semantics](https://supabase.com/docs/reference/javascript/auth-signout), [JWT authentication-method fields](https://supabase.com/docs/guides/auth/jwt-fields), [Stripe subscription cancellation](https://docs.stripe.com/api/subscriptions/cancel), [Stripe checkout expiration](https://docs.stripe.com/api/checkout/sessions/expire).
