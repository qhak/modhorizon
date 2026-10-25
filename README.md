# ModHorizon

Current release: **v0.15.0**. See [change notes](CHANGELOG.md) for version-by-version changes and validation. Earlier batch/prototype descriptions below are historical; current generation and billing behavior is documented in [the backend guide](docs/backend-generation.md), and full shader-code generation in [the shader workflow](docs/shader-source-generation.md).

## Configured local testing

Separate authored block-material and clean-sky candidates, with Aurora candidate03 as the owner's water baseline, are documented in [the specialist example guide](docs/specialist-rendering-examples.md). These local material assets are experimental; the live generator does not yet produce binary textures.

From this repository, use `npm run local:preview` when testing with the provider
credentials and Cloudflare bindings already configured in the ignored `.dev.vars`.
This launcher loads the settings into the Next.js server, sets the loopback origin
and keeps the testing model restriction enabled. Open
[the create page](http://127.0.0.1:3215/create).

`npm run dev` alone does not load `.dev.vars` provider keys into `process.env`.
If no other provider configuration is present, only the fixed demo model will be
available. `/api/status` reports model availability without revealing credentials.
Do not commit `.dev.vars`, local account databases or credit grants.

On Windows, this launcher also starts a private raw GLSL compiler when the bundled
Python is present. Set `SHADER_COMPILER_PYTHON` to an absolute Python executable
path if needed. Shader ZIPs then require a compiler pass. One optional paid repair
is **off by default** and has an explicit extra credit limit in the create form.
This checks native stages/links, not Iris integration or visual quality. See
[local compiler behavior and limits](docs/local-shader-compiler.md).

Release commits include their version, a change summary, validation and remaining
limitations. Matching annotated tags and dated entries in CHANGELOG.md identify
each version; preserve previously published history.

A standalone Next.js application for creating Minecraft plugins, mods, resource packs, shader packs and datapacks. Run commands from this `modhorizon` directory, independently of the surrounding CutRank application.

The homepage includes 30 searchable example prompts. [Datapack support](docs/datapacks.md) covers Java 1.13 onward, with a fixed sample ZIP available without an AI key or credits.

Batch 1 introduced the cinematic landing page at `/` and preserved the original prototype at `/workspace`. Accounts and credit rewards are presented as planned, with no client-side balance changes. See the [Batch 1 implementation record](docs/batch-1.md) for assets, validation and remaining scope.

Batch 2 adds the [local dashboard](http://127.0.0.1:3215/dashboard) with real SQLite project persistence, creation and library management. Start Building now opens `/dashboard`; the original prototype remains at `/workspace`. Use Node 24 and `npm run dev`, then open a local session. Projects live in the ignored `.data/modhorizon.sqlite` database. Hosted authentication/storage and credits are not configured, so production dashboard access fails closed. See the [Batch 2 record](docs/batch-2.md).

Cloudflare deployment and hosted-preview configuration are documented in [Cloudflare hosting](docs/cloudflare.md). Run `npm run deploy` to build and deploy the configured Worker. The initial hosted version disables generation until provider credentials are connected.

The current create workspace's generation endpoints, credit quotes, durable reservations,
and remaining launch requirements are documented in [Generation and credit backend](docs/backend-generation.md).
Stripe configuration is documented in [Stripe billing setup](docs/stripe-setup.md).

## Local setup

Install Node.js 22 LTS or newer, then:

```powershell
cd modhorizon
npm install
Copy-Item .env.example .env.local
npm run dev
```

On macOS/Linux, replace `Copy-Item .env.example .env.local` with `cp .env.example .env.local`. Open [localhost:3215](http://localhost:3215). The server binds to loopback by default. Java and Gradle are not required to explore the development preview.

Start with:

> Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.

The development provider generates a fixed, clearly identified source preview for this example. It does not understand arbitrary prompts or follow-up edits. With no build service configured, development mode does not compile Java, report a successful build, or provide a downloadable JAR. A working end-to-end compiled artifact requires the separate build service described in [the architecture](docs/architecture.md).

## Configuration and checks

Copy the provided `.env.example` and follow its comments to select the AI provider and build service. Keep all API keys in server-only environment variables; never prefix them with `NEXT_PUBLIC_`.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Server-only provider credentials. Configure one or more to enable those model choices. |
| `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, `GEMINI_BASE_URL` | Optional trusted provider API bases. |
| `AI_PROVIDER` | `mock` for the local fixed example preview. Kept for compatibility with earlier setup. |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | Legacy OpenAI-compatible Chat Completions configuration. |
| `BUILD_SERVICE_URL` | Exact trusted build HTTP endpoint; unset locally to preview sources only. |
| `BUILD_SERVICE_TOKEN` | Credential for the trusted build service. |

Service URLs require HTTPS; HTTP loopback is permitted only in development. Configuring a URL does not create a build worker. The real provider must support Chat Completions with JSON-object responses. Follow-up edits are available only through the real provider.

```powershell
npm test
npm run typecheck
npm run build
```

Tests cover the generation/build orchestration and validation. They do not prove Minecraft behavior or the isolation of an external worker.

For a production-mode smoke test, configure a real AI provider and a trusted build service first, then run `npm run build` and `npm start`. Mock modes are development-only and must fail closed in production. This prototype has no production authentication, tenant ownership, durable project storage, distributed queue, payment flow, or abuse controls. Keep it local until those deployment requirements are addressed.

## Manual Paper 1.21.4 acceptance test

Perform these steps only after obtaining a real compiled JAR from a reviewed build service. The preview cannot satisfy this test, and no Minecraft runtime verification is claimed by this repository.

1. Create a disposable local server folder and use Java 21. Download **Paper 1.21.4**, rename its server JAR to `paper.jar`, and follow [Paper's server setup guide](https://docs.papermc.io/paper/admin/getting-started/). Use a fresh test world without other plugins. Start it with `java -Xms1G -Xmx2G -jar paper.jar --nogui`; review and accept the Minecraft EULA if you agree, then start again. Restrict the server to your machine using `server-ip=127.0.0.1` in `server.properties`.
2. Stop the server. Copy the generated plugin JAR into `plugins/`, then restart. Confirm the console enables `ZombieSprint` without exceptions and `/plugins` lists it. Join with a Minecraft Java 1.21.4 client on `localhost`. Give your test player operator permissions through the server console if needed.
3. Set `/time set midnight`, `/difficulty normal`, and `/gamemode survival`. Clear effects with `/effect clear @s`. Summon `/summon minecraft:zombie ~ ~ ~3 {NoAI:1b}` and kill it with a sword. Expect the activation message and **Speed II**, lasting about **10 seconds** (200 server ticks at 20 TPS). Confirm it expires. Repeat a kill before expiry to check reapplication.
4. Clear effects before each case. Kill a skeleton, husk, drowned, and zombie villager: none should grant this reward. Let an untouched zombie die from an environmental cause: no player should receive the effect. With two players, confirm only the player credited with the kill receives it.
5. Kill a zombie using your bow or crossbow. The implementation uses Paper's `getKiller()` attribution, so a projectile kill credited to the player should grant the effect. A mob or dispenser projectile with no credited player should not. Also test a recently player-damaged zombie that later dies to fire/falling: Paper may still credit the player; that attribution is the current intended boundary, rather than a requirement for a direct melee final hit.
6. Test an existing Speed effect separately. Minecraft effect merging can preserve a stronger effect; this plugin does not promise to downgrade it. Verify no unexpected console exceptions. Change `plugins/ZombieSprint/config.yml`'s `activation-message`, restart, and confirm the changed message.

See the [Paper 1.21.4 `LivingEntity` API](https://jd.papermc.io/paper/1.21.4/org/bukkit/entity/LivingEntity.html) for kill attribution and [the `PotionEffect` API](https://jd.papermc.io/paper/1.21.4/org/bukkit/potion/PotionEffect.html) for duration units. Compilation and behavior on each selectable Minecraft version require separate verification.

## Next implementation steps

Implement and audit the isolated Java 21/Gradle worker, then run the above acceptance test with a real artifact. Next add durable jobs and artifact storage, cancellation and progress streaming, ownership/authentication, quotas and rate limits, and broader prompt and gameplay evaluation. Fabric and NeoForge remain unavailable.

## Private local compiler

A private Paper 1.21.4 builder and local preview launchers are prepared in [the local builder guide](build-service/local/README.md). Docker Desktop provisioning, offline compilation, HTTP adapter and cleanup acceptance have passed for Paper 1.21.4. The live website remains on v0.2.3 and is not connected to your PC.

Shader reference audit: [Amberglass findings and next test](docs/amberglass-reference-audit.md).

Horizon revision: [GoldenHour findings and acceptance](docs/golden-hour-horizon-audit.md).

Water balance: [GoldenHour water03](docs/golden-water-balance.md).
