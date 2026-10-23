# Generation and credit backend

The create workspace supports plugins, mods, resource packs, shader packs and
datapacks through `/api/generate`. Plugins and mods require a compatible isolated
build service for a JAR. Text-based resource/shader packs and datapacks are
validated and packaged into ZIPs without a Java build service. All AI generation
still requires a configured provider and the normal account/credit checks.

Datapacks target vanilla Minecraft Java 1.13 onward, with server-owned pack
metadata and version-correct directory checks. See [Datapacks](datapacks.md) for
installation, validation limits and the free fixed sample download.

## Frontend integration

1. Open a session with `POST /api/billing/session` using an empty JSON object.
   The server sets an HttpOnly cookie. Keep all requests on the same origin.
2. Use `GET /api/status` for configured models and supported `artifactTypes`.
3. Send the generation input to `POST /api/generate/quote` to show estimated usage
   and the temporary hold. This endpoint makes no AI calls and spends no credits.
4. Send the same input to `POST /api/generate` when the user chooses Generate.
   A quote does not reserve funds; availability and balance are checked again.
5. Refresh `GET /api/billing/account` afterward to show the settled balance.

Example JSON input to both generation endpoints:

```json
{
  "prompt": "Make a floor is lava plugin where lava rises one block every fifteen seconds.",
  "artifactType": "plugin",
  "platform": "paper",
  "version": "1.21.4",
  "modelId": "gpt-6-luna",
  "reasoningEffort": "medium"
}
```

The quote response contains `quote.estimatedCredits`, `reservedCredits`, `balance`,
`affordable`, `modelId` and `reasoningEffort`. Its `scope` is `one_model_pass` and
`repairsIncluded` is false. Estimates use configured rates and approximate input
tokens. They are not an exact provider invoice or a guaranteed total project cost.
Each automatic repair requests and pays for a separate model pass. The backend
stops repairs if the next hold cannot be covered, retaining the available source.

Free accounts can use Economy models. An active paid subscription unlocks every
configured model. Other subscription states block paid generation. Unsupported
reasoning levels, mismatched content/platform pairs and oversized input are rejected
before a provider call. Quotes require a valid session and a configured model.

## Credit reservations

Apply D1 migrations before running this version:

```powershell
npm run db:migrate:local
```

Before deploying this code, apply the remote migrations as well:

```powershell
npm run db:migrate:remote
```

Migration `0002_generation_reservations.sql` adds durable per-call holds and links
them to ledger entries. Debit, reservation creation and ledger insertion run in one
D1 transaction. Completion changes a reservation from `held` to exactly one of
`settled` or `refunded`; duplicate completions cannot credit the account twice.
Reservation ownership is checked on completion. Accounts cannot spend below zero.

Successful responses settle against reported input and output usage, including
Gemini thought tokens. All provider requests set a 16,000-token output limit.
Low reasoning never reduces the hold below the configured output ceiling. Customers
are charged at most their hold for a pass; estimates and configured rates still
need review against actual provider costs before selling credits.

Provider failures refund a reservation. A database failure after a successful AI
call retains the hold, rather than refunding a completed call. Crashes can also
leave holds pending: an operator must reconcile old `held` reservations using
provider records. Do not automatically release them solely because they are old.

## Remaining launch work

Browser guest sessions still need verified identity, account recovery and abuse
controls before public free generation. Generation needs durable jobs, cancellation
and distributed rate limits. Stripe remains restricted to test mode. This change
does not make a public paid launch ready or impose a global provider spending cap.
Use the Workers runtime for D1-backed local billing; plain Next development without
Cloudflare bindings cannot initialize billing sessions.

Provider reference used for Gemini usage and output limits:
[Gemini Interactions API](https://ai.google.dev/api/interactions-api).
