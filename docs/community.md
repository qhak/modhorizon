# Community release

The community uses the existing ModHorizon visual system and Supabase confirmed-account sign-in. Public content lives in the existing Cloudflare D1 binding, in dedicated community tables; it does not copy private workspace projects, source, prompts, build logs, email addresses or billing records.

## Routes and publishing

- `/explore`: server-rendered approved showcases, type/search/tag filtering and pagination.
- `/creators/<handle>`: an explicitly created public profile and its approved showcases.
- `/showcase/<id>/<slug>`: stable public creation pages, screenshots, installation notes, external release links and discussion.
- `/community`: authenticated creator manager. `/community/profile` edits public identity; `/community/new` saves drafts or submits for review.
- `/community/moderation`: server-authorized review queue and reports. Approved content can be hidden. Editing an approved showcase withdraws it until review; moderation-hidden posts cannot be republished by their owner.
- `/community/preview`: labelled, non-indexable design samples. No demo posts or accounts are inserted into the database.

The successful-build share button copies only project title, artifact kind, target and version into a local form prefill. Sharing is a separate, explicit action. Downloads are optional creator-hosted HTTPS release pages on GitHub, Modrinth or CurseForge. This release does not host uploaded JARs/ZIPs, audit downloads, or implement remixing.

## Configuration

1. Apply `0006_community.sql` using the existing D1 migration workflow. Local development: `npm run db:migrate:local`. Apply remotely as a separate deployment step.
2. Keep the existing Supabase URL and publishable key configured. Participation requires a confirmed, non-anonymous account verified by `getUser()`.
3. Set `COMMUNITY_MODERATOR_IDS` to a comma-separated list of trusted Supabase user IDs in server runtime configuration. Empty means nobody can approve; there is no browser-controlled or user-metadata moderator role.
4. Set `APP_ORIGIN` to the actual public HTTPS origin when deploying. Local development and absent/invalid public origins are non-indexable. Production sitemap entries include approved showcases and creators with published work. Search ranking/indexing is not guaranteed.

No live migration, moderator assignment, publication or deployment is performed by adding these files.

## Boundaries and validation

Mutations require a matching browser Origin and verified account; profile ownership is derived server-side. Draft and pending screenshots are visible only to their owner, with pending screenshot access for trusted moderators. Screenshot uploads are PNG/JPEG only, bounded by byte size, declared dimensions and per-account quotas; this is not a full image-decoder or malware audit. Text is rendered as escaped text, and structured data escapes script terminators. Engagement uses database records, not invented counters.

New/updated showcases require review. Comments and public profile edits use bounded, authenticated writes without a separate pre-publication review queue. v0.19.0 adds reports, hide/restore actions and audit records for this content, plus a disabled-by-default account deletion flow. See [moderation, deletion setup and staging acceptance](community-moderation-and-deletion.md). Before a broad public launch, complete disposable staging deletion/billing acceptance, set a retention policy, validate deployment-origin/robots behavior and arrange operational moderation coverage.

Tests exercise the migration against SQLite with a D1 adapter: ownership, publication/withdrawal, stale-review races, hidden content, screenshot access, rate limits, public data minimization, interaction records, search filtering, CSRF, URL validation and structured-data escaping. Browser checks cover the design preview, anonymous routes and the confirmed-account local publishing/interaction flow with two accounts; see [local acceptance record](community-acceptance-20261026.md). Production staging acceptance remains separate.
