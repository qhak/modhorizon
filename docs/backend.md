# Generation and isolated build contract

The Next server validates requests, calls a modular provider, validates its source file list, and submits it to an independently operated build service. It never writes generated files to disk, executes Java, installs Gradle, or runs generated build scripts. `src/lib/types.ts` defines the provider/build interfaces. All configuration is read on the server. Neither provider nor build-service credentials enter browser responses.

`POST /api/generate` accepts `{prompt,version,modelId,artifactType,target,project?:{name,files}}`. The `artifactType` and `target` fields default to `plugin` and `paper` for old clients. Valid pairs are `plugin/paper`, `mod/fabric|forge|neoforge`, `resource_pack/vanilla`, and `shader_pack/iris|optifine`. `GET /api/generate` returns the server-owned artifact catalog for UI selectors, including labels, current output capability, and limitations. `modelId` must be in the server-owned model catalog and its provider must be configured. The optional complete project supports follow-up edits within the same artifact type and target. Supported Minecraft versions are currently 1.21.1 through 1.21.11.

Each artifact type has a server-owned expert playbook and task-specific skills. These are specialized instructions, schemas, and validators supplied to the selected model; they do not fine-tune or train the model weights. Generated source must pass the selected artifact validator before it is returned. Requests are limited to 200 KB; generated source to 150 KB, 30 files, 40,000 characters per file. Traversal, absolute paths, case-insensitive collisions, arbitrary build scripts, dependencies, and binary payloads are blocked.

The Paper plugin path can use the existing isolated build-service adapter and produce a JAR. Mods, resource packs, and shader packs currently return a validated source preview only: loader-specific mod builds and ZIP packagers are not connected. Resource-pack text files can be generated, but textures and other binary assets cannot. The API never labels these previews as installable. Plugin outputs permit Java plus plugin.yml/config.yml; mod outputs permit Java and loader metadata; resource packs require pack.mcmeta and namespaced text assets; shader packs require GLSL vertex and fragment stages. The runtime details and exact compatibility are not compiler-verified for these three preview modes.

## Modes

- Development defaults to `AI_PROVIDER=mock`, a deterministic source example implementing exactly the zombie Speed II / ten-second prompt. Other requests and follow-up edits are rejected with a clear message. The fixture does not interpret arbitrary natural language. It has not been compiled by this app.
- `OPENAI_API_KEY` enables the server-side OpenAI Responses API model choices. `ANTHROPIC_API_KEY` enables the Anthropic Messages API choices. `GEMINI_API_KEY` enables Gemini Interactions API choices. The server selects only IDs from `src/lib/models.ts`; credentials and provider endpoints never come from the request. `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, and `GEMINI_BASE_URL` are trusted HTTPS endpoints (HTTP loopback only in development).
- `AI_PROVIDER=openai-compatible` with `AI_API_KEY`, `AI_MODEL`, and `AI_BASE_URL` remains supported for earlier Chat Completions setups. In that mode the selected OpenAI catalog ID is sent to the configured compatible endpoint.
- Without `BUILD_SERVICE_URL`, development returns an explicit source preview with no JAR. No mock compilation or fake download exists.
- Production disables mock generation and requires a build-service URL and token for compilation. Missing configuration yields a clear failure, never success.

## Build service protocol

Configure `BUILD_SERVICE_URL` as the exact trusted HTTPS POST endpoint and `BUILD_SERVICE_TOKEN` as a secret bearer token. HTTP loopback is allowed only outside production. Redirects are rejected. Environment URLs are administrator-controlled and must never come from a user request; protect them from untrusted configuration changes and enforce network egress allowlists at deployment.

Request JSON:

```json
{"schemaVersion":1,"platform":"paper","javaVersion":21,"minecraftVersion":"1.21.4","project":{"name":"ZombieSprint","files":[{"path":"src/main/java/dev/example/Main.java","content":"..."},{"path":"src/main/resources/plugin.yml","content":"..."}]}}
```

Response JSON: `{ "success": false, "logs": ["Compiler diagnostic"] }` or `{ "success": true, "logs": ["BUILD SUCCESSFUL"], "artifactBase64": "UEsDB..." }`. At most 100 log lines of 2,000 characters each; decoded artifact at most 5 MB. The app checks ZIP local-header bytes as a format sanity check, not proof of trustworthy contents or runtime correctness. The service must ensure the returned artifact is the actual generated plugin, not dependencies or an arbitrary archive. Do not put credentials, environment variables or host paths in diagnostics.

The service is an interface, **not an included sandbox implementation**. Before connecting one, it must authenticate requests; repeat input validation; create a disposable non-root sandbox for every build; use an immutable server-owned Gradle template targeting Java 21 and the selected Paper API; never accept user Gradle scripts; deny Docker socket and host filesystem access; mount no host secrets; enforce CPU, memory, disk, PID and wall-time limits; and deny outbound networking except a controlled read-only dependency mirror. Prefer preloaded dependency caches and fully disabled egress during compilation. Java annotation processors and Gradle execution must remain within the sandbox. Destroy the sandbox after collecting bounded compiler diagnostics and the JAR. Run downloaded plugins only on a disposable test server. Do not place a Docker daemon or execute generated Java in the Next process.

The request timeout is 120 seconds per build and 90 seconds per provider call, with a separate 15-second limit for receiving JSON bodies, including incoming requests. A failed compilation triggers at most **three repairs** (four total build attempts), each sending current source and diagnostics to the provider. Network/service failures do not trigger repairs. Compilation is not behavior verification.

## MVP operational limits

Artifacts are process-memory only, expire after 30 minutes and are evicted after 20 stored artifacts. Restarts, multiple instances, and serverless process changes may invalidate downloads. Browser history is separate; it is not persistent server storage. Download IDs are random UUID bearer capabilities; no accounts or ownership checks are implemented. Keep this MVP private/local. Before public deployment add authentication and artifact authorization, durable object storage, a job queue, per-account quotas/rate limits, abuse controls, and a provisioned sandbox build service. The current two-job concurrency guard is process-local and not a public abuse-control system. A request may last several minutes; hosting needs long request support or the future durable queue.

Verbose compiler and pipeline logs are returned in the project. Provider service response bodies are deliberately excluded from errors so secrets accidentally echoed by providers are not exposed. The administrator must configure the build service to return sanitized logs.
