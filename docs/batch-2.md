# Batch 2 — dashboard and project creation

Completed 21 October 2026. Batch 3 is not started.

## Implemented

- `/dashboard`, `/dashboard/projects`, `/dashboard/new`, `/dashboard/credits`, `/dashboard/settings`, and `/dashboard/projects/:id`.
- Compact responsive sidebar/topbar, account menu, saved display name, recent projects, quick actions, empty/loading/error states and reusable credit presentation. No ledger exists: the balance is unavailable, never an invented zero or signup reward.
- Real project creation, opening, rename, confirmed deletion, starring, search, updated/created/name sorting, plugin/mod filtering and grid/list views. Only Paper 1.21.1–1.21.11 can be created. Mod choices are visibly disabled and rejected on the server.
- File-backed SQLite in `.data/modhorizon.sqlite`. Projects, descriptions, timestamps, stars, revisions and source snapshots survive reloads and database reconnection. The file is excluded from Git and source archives.
- Generated source is saved to the managed project without changing its user-selected display name or version. Concurrent edits produce a conflict instead of overwriting newer data. Save failures retain source in the workspace/browser history and provide retry/export guidance.
- Optional idempotent import of existing browser source history; no automatic migration or clearing of browser history. Restored source never assumes that a temporary build artifact is still available.
- The original workspace is extracted into a shared component and remains at `/workspace`. Existing provider, compilation and download endpoints are unchanged. Batch 1 visuals/video are unchanged; only the three Start Building destinations now point to `/dashboard`.

## Access boundary and limitations

The original app had no database, user accounts, authentication, payment system or credit ledger. This batch supplies a **single-user local dashboard**, not production account authentication. The local session can be opened only in development with a loopback Host; the dev script binds to 127.0.0.1. The session cookie is HttpOnly/SameSite=Strict, expires after seven days, and its random token is stored hashed. Mutations require a matching Origin; every project operation requires a valid session and owner scope. Ending a session revokes it in SQLite.

Production denies local session issuance and project database access; the dashboard displays the account-integration limitation. Multi-user identity, hosted storage/sync, a credit ledger, payments, referral verification, mod loaders and an editor rewrite are outside this batch. The legacy prototype's pre-existing access model is preserved; the new dashboard guard does not claim to secure those old generation/download endpoints. No deployment or merge was performed.

Use the installed Node 24 runtime for the local SQLite dashboard. Source archives exclude `.data`, dependencies, secrets and caches. Back up the live database separately using SQLite-aware tooling before moving machines; copying only source does not back up projects.

## Validation

- TypeScript and Next production build pass; all **17 tests pass** (13 existing, four dashboard tests).
- File-backed tests cover persistence after reopening, ownership isolation, rename/star/delete, revision conflicts, idempotent import, source/path validation, expired artifact flags and session revocation.
- HTTP smoke checks: anonymous reads 401; absent/foreign mutation Origin 403; HttpOnly/Strict cookie flags; unsupported loaders 400; create/read/rename/star/delete; stale writes 409; missing projects 404; revoked sessions 401.
- Production HTTP smoke: homepage, original workspace and status route serve; local session/project APIs return 503 and the dashboard explains missing hosted authentication.
- Browser: create and open a real test project; generate the existing local example; reload saved source; star, rename, search, sort, list/grid, mod filter and explicit delete confirmation. Test-only managed projects were deleted; browser history is intentionally preserved. Mobile menu and phone/tablet/desktop layouts reviewed without horizontal document overflow.
- OpenNext Cloudflare build and Wrangler deployment **dry run** pass. No deployment made. An initial skip-build attempt lacked standalone build assets; the full adapter build supplied them successfully.
- No lint script exists. A development hot-reload conflict-error issue found during checks was fixed by caching the native SQLite connection rather than a route-bundled repository instance.

## Files and references

Main files: `src/components/dashboard.tsx`, `credit-balance.tsx`, shared `workspace.tsx`; `src/app/dashboard/` routes/styles/loading/error; `src/app/api/library/` session/project routes; `src/lib/dashboard-db.ts`, `dashboard-auth.ts`, `managed-project.ts`; `tests/dashboard.test.ts`; README/architecture notes and `.gitignore`.

Screenshots: [dashboard](batch-2-dashboard.png), [creation](batch-2-create.png), [mobile](batch-2-mobile.png).

[Kodari public prompt page](https://kodari.ai/prompt) and [public feature descriptions](https://kodari.ai/) checked 21 October 2026. Private project management was not accessed. Reference informed project organization and prompt/workspace structure; no proprietary assets/code copied. SQLite API: [Node 24 documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).
