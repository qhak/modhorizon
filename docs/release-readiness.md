# ModHorizon release readiness

Status checked 27 October 2026. Recheck Git, Cloudflare, Supabase, Stripe and D1
state before acting on any item: repository records do not prove current provider
settings.

## Release baseline

- `origin/main` is v0.15.0 (`9b09438`). The local `main` ref is stale; use the
  remote-tracking branch when comparing release work.
- v0.19.0 (`9384a11`) is pushed on `codex/community-showcases`, not merged or
  recorded as deployed. Its 221 tests, TypeScript check and isolated production
  build passed. The tracked local tree also has a pre-existing `next-env.d.ts`
  modification; review and preserve it separately.
- v0.18.2's two-account publishing acceptance was local. It did not exercise
  production Cloudflare behavior. The v0.19.0 destructive provider operations
  were fixture/mock tests; deletion remains disabled locally.
- Historical deployment notes describe older versions and configurations. No
  checked record confirms that v0.19.0 is live or that all production settings
  still match those notes.
- v0.20.0 added disabled-by-default rewarded ads and subscription promotion
  codes; v0.21.0 adds the disabled-by-default social screenshot rewards hub.
  Neither version is a production deployment. Apply migration 0009 before
  rewarded ads and migration 0010 before social rewards. Configure exact social
  profiles and OpenAI vision review, confirm platform rules, and complete
  authenticated staging acceptance before enabling social campaigns.

## Required before a public release

### Release and deployment

- [ ] Review the full `codex/community-showcases` diff against `origin/main` and
  decide whether v0.19.0 is the release scope. Resolve the local `main` ref and
  release-documentation drift without rewriting published history.
- [ ] Review the unrelated `next-env.d.ts` worktree change; preserve or restore
  it only according to its owner and origin.
- [ ] Confirm the current production Worker version, D1 migration state,
  bindings, secrets and public routes. The recorded state is not current-state
  proof.
- [ ] Apply only missing D1 migrations in order, including `0006_community.sql`,
  `0007_moderation_and_deletion.sql` and `0008_deletion_activity_guard.sql`.
  Take/verify the normal production backup and confirm rollback/recovery steps.
- [ ] Configure and verify `APP_ORIGIN`, Supabase auth settings and a permanent
  server-side `COMMUNITY_MODERATOR_IDS` allowlist. An empty allowlist means no
  one can approve showcases.
- [ ] Deploy the reviewed release, then run production smoke checks and confirm
  the rollback procedure. Do not enable account deletion during deployment.

### Identity, email and payments

- [ ] Configure verified-domain custom SMTP before public email signup. Complete
  signup, confirmation, same-browser guest-credit attachment, password recovery
  and cross-browser sign-in acceptance. Complete Google sign-in acceptance;
  reaching the Google account chooser is not a completed login test.
- [ ] Configure and verify signup abuse protections, including Supabase rate
  limits and production bot/CAPTCHA controls.
- [ ] In a separate Stripe test-mode environment, exercise plan checkout,
  top-ups, signed webhook fulfillment, duplicate events, renewal, failed payment,
  cancellation/downgrade, portal access and account ownership. Verify resulting
  D1 ledger entries and balances.
- [ ] Recheck configured Stripe prices, provider token rates, credit estimates,
  margin and payment/hosting costs before charging real customers.

### Generation and build safety

- [ ] Confirm the production AI providers, models, keys, usage limits and error
  behavior. Run controlled real generation for each artifact type included in
  the release; keep generation disabled where provider/build dependencies are
  absent.
- [ ] Provision and review a production isolated build worker before offering
  generated JARs. It must use pinned server-owned templates, offline dependency
  resolution, no user build scripts, disposable least-privilege sandboxes,
  resource/time/output limits, cleanup and sanitized logs.
- [ ] Before multi-user generation, implement/verify durable jobs and artifacts,
  authenticated ownership checks, expiry/cleanup, cancellation/progress handling,
  distributed quotas/rate limits and a provider spending cap. Process-memory
  artifacts and process-local concurrency are not multi-instance controls.
- [ ] Exercise provider/build timeouts, failed builds, retries and held-credit
  reconciliation in staging. Never refund a held reservation solely because it
  is old; reconcile it against provider usage.
- [ ] Verify production logging, alerts, backup/restore and support procedures
  without recording prompts, credentials or full provider responses.

### Community and account deletion

- [ ] Complete the staging two-account flow: profile, private draft and
  screenshot, submit/review/approve, public discovery, edit/withdraw, likes,
  follows, comments, reports, hide/restore and account isolation.
- [ ] Verify public HTTPS canonicals, robots rules and sitemap with the deployed
  `APP_ORIGIN`; arrange ongoing moderator coverage.
- [ ] Decide whether bounded but authenticated profile/comment edits without
  pre-publication review are acceptable. Decide policy for unvalidated image
  contents and third-party download links.
- [ ] Set retention periods and confirm deletion/billing disclosures, including
  retained financial records, forfeited unused credits/time and refund handling.
- [ ] In disposable Supabase/Stripe test mode, test deletion using fresh
  password and Google authentication, open-checkout expiry, subscription
  cancellation, session revocation, stale-token denial, owned-content removal,
  unrelated-account isolation, retries and failure recovery across devices.
- [ ] Define operator reconciliation for stuck deletions, including auth removal
  succeeding before the final D1 update. The current release has no background
  deletion worker. Keep `ACCOUNT_DELETION_ENABLED` off until acceptance and
  recovery procedures pass.

## Scope decisions for a genuinely full release

These are capability gaps, not all mandatory for a clearly scoped beta. Either
complete and accept them or exclude them explicitly from product claims:

- [ ] **Mod loaders:** production build templates/workers and runtime acceptance
  for Fabric, Quilt, Forge and NeoForge; the documented worker template is Paper.
- [ ] **Paper plugins:** production build-path acceptance and a documented
  Minecraft/Paper support matrix. A positive test of one gameplay example does
  not validate all plugins or versions.
- [ ] **Resource packs:** live model output does not generate arbitrary binary
  textures. Authored examples and fixed texture recipes do not provide general
  image generation.
- [ ] **Shaders:** compile checks do not establish Iris runtime behavior,
  reference fidelity or FPS. Run controlled in-game acceptance for the current
  examples and decide whether current AI output quality supports the claims.
- [ ] Decide whether generated-file hosting, persistent cloud project storage,
  artifact scanning and remixing belong in the full product. These are not
  included in the current community release.

## Evidence

- [Community rollout and acceptance](community-acceptance-20261026.md)
- [Moderation, deletion setup and staging requirements](community-moderation-and-deletion.md)
- [Account setup and acceptance](account-setup.md)
- [Generation and credit backend limits](backend-generation.md)
- [Build-service security contract](backend.md)
- [Shader quality evidence and limits](shader-quality.md)
- [Community boundaries](community.md)
