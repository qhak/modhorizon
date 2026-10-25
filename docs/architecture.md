# ModHorizon architecture

## Scope and trust boundaries

Batch 2 adds a separate local SQLite project library under `/dashboard`, documented in [the implementation record](batch-2.md). It persists project metadata/source and protects its APIs with a development-only local session and owner-scoped queries. It does not introduce hosted authentication, credit billing, or durable build artifacts. The original prototype and generation/download access model described below remain in place; production dashboard/database access is disabled until hosted identity and storage are integrated.

The UI and Next.js API live in a separate `modhorizon` application. The API selects expert playbooks for Paper plugins, Fabric/Forge/NeoForge mods, vanilla resource packs, and Iris/OptiFine shader packs. Resource and shader packs can be downloaded as ZIPs; Paper plugin JAR builds use the build-service adapter; mod JARs require a loader-capable worker that is not included yet. The dashboard project library uses local SQLite. Restarting the application loses server-held build artifacts. Browser history is a convenience, not durable project storage or access control.

The application accepts descriptions and displays generated text. It never runs generated Java, Gradle, shell commands, or Minecraft plugins inside the Next.js process. AI output is untrusted even when a paid provider returns it. The `AIProvider` and `BuildService` interfaces in `src/lib/types.ts` keep provider selection and compilation separate from orchestration. Artifact playbooks and task skills are server-owned prompt guidance and validators; they specialize a general model without fine-tuning its weights.

## Generation flow

1. The generation API validates request size, prompt length, supported Minecraft version, artifact type/target pairing, and any source project supplied for an edit.
2. The selected provider receives a server-owned expert playbook for the requested artifact. Task-matched skills add guidance for server-thread safety, mod client/server separation, resource identifiers, and shader performance. The deterministic development provider supports the first Paper plugin example only.
3. The artifact-specific validator enforces allowed text file paths, metadata, and basic structure. It rejects traversal, absolute paths, duplicate names, build scripts, binary content, and excessive file counts/sizes. Files stay in memory in the web application; any worker must validate them again before writing.
4. Paper plugin and mod sources can go to the isolated build-service adapter; mod builds require a loader-capable worker template that is not included yet. Resource packs and shader packs are packaged into ZIPs in memory after validation. Resource-pack metadata is set by a server-owned version table; textures remain outside the text-only generator. Shader source is not compiled or GPU-tested.
5. Paper compilation failures can be supplied to the AI for at most three repairs after the initial attempt. Each revised project is validated again before the next build. Failure, provider errors, and timeout details become meaningful logs rather than successful artifact claims.
6. A valid ZIP enables a resource-pack or shader-pack download; only a successful build-service response containing a JAR enables a plugin or mod download. Source previews do not claim installable artifacts. Compilation success says nothing about gameplay correctness or whether a plugin or mod is safe to install.

## External build worker: required implementation

The HTTP adapter is a protocol boundary, not a container runner. The experimental private implementation in `build-service/local/` provides a Docker job runner and loopback service, but requires Docker installation and real offline compilation acceptance. No production compiler is provisioned or certified. Its preview deliberately produces no fake JAR. Do not connect this interface to a service that executes source on the Next.js host.

`RemoteBuildService` sends an authenticated JSON POST to `BUILD_SERVICE_URL` using `BUILD_SERVICE_TOKEN` as a bearer credential:

```json
{
  "schemaVersion": 1,
  "platform": "paper",
  "javaVersion": 21,
  "minecraftVersion": "1.21.4",
  "project": {
    "name": "ZombieSprint",
    "files": [{ "path": "src/main/resources/plugin.yml", "content": "..." }]
  }
}
```

The full request includes every validated Java/resource file. A response is `{ "success": false, "logs": ["compiler diagnostics"] }` or `{ "success": true, "logs": ["..."], "artifactBase64": "..." }`. Logs are limited to 100 lines of 2,000 characters; artifacts are limited to 5,000,000 decoded bytes. The adapter has a 120-second HTTP timeout, rejects redirects, and checks ZIP magic bytes. This is basic response validation, not proof of a valid or harmless plugin. The worker must enforce its own execution deadline and artifact checks. See [the backend contract](backend.md) for implementation details.

A production worker must satisfy all of the following before it is trusted:

- Authenticate requests, constrain payload and output sizes, validate every path again, and use a unique temporary directory per job. Treat logs as untrusted text and redact infrastructure details.
- Run a pinned Java 21 and Gradle toolchain in a disposable sandbox with an unprivileged user, read-only base filesystem, small writable temporary filesystem, no host directory mounts, no Docker socket, no cloud metadata access, and no host/environment secrets. Keep the worker control-plane credential outside the compilation sandbox.
- Enforce CPU, memory, process-count, disk, output, and wall-clock limits. Terminate the whole process tree at timeout and destroy the sandbox after every job. An HTTP timeout alone does not stop a remote compiler.
- Generate the Gradle build definition from a reviewed server-owned template. Allow no submitted Gradle scripts, arbitrary plugins, dependency declarations, wrapper binaries, or annotation processors. Disable automatic processor execution; compiling Java can execute processors from its compilation classpath.
- Resolve the version-specific Paper API and Gradle dependencies through a vetted, pinned dependency cache in a separate controlled preparation step. Run untrusted compilation offline with network disabled. A broad Internet allowlist is not equivalent to an isolated offline compiler.
- Build only; never load or run the resulting plugin. Validate and bound the output JAR, return it through an authenticated channel, and retain artifacts with explicit expiry and access policy. Record toolchain/dependency versions, source digest, logs, and artifact digest for traceability.

Use [Paper's project setup documentation](https://docs.papermc.io/paper/dev/project-setup/) for the server-owned Gradle template. For 1.21.4, select the corresponding `io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT` API and Java 21 rather than blindly copying the current docs' latest version. Snapshot dependencies require a deliberate reproducibility policy in the worker cache.

A concrete [server-owned template](../build-service/template/README.md) is included under `build-service/template/`. It pins the Gradle 8.14.5 scaffold baseline, targets Java 21, validates the Minecraft version against an allowlist, uses `compileOnly` for Paper, disables annotation processing, and names its output `plugin.jar`. It has not been executed or verified here. Provisioning vetted dependencies, reviewing current toolchain security patches, and implementing the actual isolated worker remain required before compilation is available.

## Deployment limitations

Development mocks must be disabled in production, with explicit errors for missing credentials or service configuration. API secrets remain server-side. The trusted build endpoint should be deployment-controlled; do not accept a build URL from a browser request.

The current app is intended for a local user. At most 20 successful artifacts are held in process memory and each expires after 30 minutes; downloads can disappear sooner after a restart or eviction. Project identifiers are not a substitute for authorization. The generation endpoint rejects mismatched Origin headers and applies a two-request process-local concurrency guard. These controls are insufficient for a public service. Before an Internet deployment, add authenticated ownership checks for every project and download, comprehensive request deadlines, distributed quotas and rate limits, durable job and artifact storage, retention/cleanup, queue isolation, operational monitoring, and tested worker hardening. Payments and subscriptions are intentionally outside this milestone.

The example's Paper runtime test is documented in the README and remains a manual acceptance requirement. A passing Java build, a mock response, or a JAR-shaped ZIP is not evidence that it passes that requirement.
