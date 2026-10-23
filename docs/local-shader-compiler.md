# Local shader compilation — v0.11.0

23 October 2026. This is an experimental development check, not a hosted GPU build service.

## Use

Run `npm run local:preview`. On Windows, the launcher locates the bundled Python,
starts the compiler on `127.0.0.1:3231`, and injects an ephemeral authentication
token into the application server. For another Windows Python executable, set
`SHADER_COMPILER_PYTHON` to its absolute path. Bare `npm run dev` does not start
this service or load the existing provider settings.

In the shader create/follow-up form, the compiler status is displayed. The initial
generation runs once. If compilation fails, the generated source and diagnostics
remain in the failed project and no ZIP is created. Enable **Allow one paid
compiler repair if needed** before submission to authorize one additional pass.
The default suggested extra limit is 10 credits, but the checkbox starts off.
The UI shows this limit separately from the initial-pass estimate/hold. Quotes
also return `optionalShaderRepairCredits` and `maximumAuthorizedCredits`.

The actual repaired-source/context estimate is computed after the first compiler
failure. Before another provider request, its full reservation must fit both the
chosen extra limit and available balance. Otherwise repair stops without a paid
call. Settlement uses actual usage within the held amount, returning unused
credits. After one repair, a second failed compile remains failed. Compiler
unavailability, invalid output and malformed provider JSON do not trigger retries.

## Boundary and protocol

`src/lib/shader-compiler.ts` only enables its client in development, at the exact
loopback endpoint. No endpoint, token or source is exposed by `/api/status`.
The service accepts authenticated server-to-server JSON `{name, files}`; browser
Origins, wrong Host headers, redirects and absent/invalid tokens are rejected.
The service revalidates paths, file counts, source size, includes and structure.
Requests are limited to 200 KB, body receipt to 10 seconds, one active job, compiler
execution to 30 seconds, and collected output to 80 KB. A compiler outage fails
closed and retains source. The compiler client has a 45-second deadline.

Each job writes only validated shader files into a new temporary directory,
invokes the fixed Python checker without a shell in a separate process and removes
that directory on completion/failure. The child receives Windows/temp settings,
not provider keys, account data or the application environment. Generated scripts
are never executed. Raw GLSL still reaches the installed GPU driver: this is
**process separation, not an OS sandbox**. Keep it on a trusted developer machine.
Do not expose it or reuse it as a public multi-tenant compilation service.

## What it proves

The existing `check_glsl.py` resolves includes and compiles/links actual stages
against the installed Windows OpenGL driver, without injected format shims. It
catches failures such as missing helper includes, duplicate uniforms and missing
varyings, demonstrated by the original EmberlakeIris output (3 failed programs).
The separate manual repair passes 20 stages / 10 links through this runner.

It does not run Iris preprocessing/patching, bind Minecraft buffers, render frames,
measure FPS, or compare images. Legitimate loader-specific macros/options can
produce raw-driver failures; diagnose those against Iris before changing correct
code. Optional/dimension programs are checked independently; this is not a full
runtime program-resolution test. A compiler pass can still have broken water,
lighting or exposure. Hosted Workers have this service disabled and report
static checks only. A future hosted compiler needs a separate authenticated,
isolated service; v0.11.0 does not provide one.

## Next evaluation

Use three distinct requests: realistic sunset water, enhanced vanilla daylight,
and cel shading. Record original output, any automatic repair, compiler logs,
actual credits and fixed-camera in-game comparisons separately. Do not label a
manually fixed output as an unchanged AI success or equate compilation with
matching the reference. No paid end-to-end repair or new visual acceptance has
yet been performed for this release.

## v0.11.1 source limits

The same validator now admits up to60 shader files and80,000 characters per file,
within150 KB total source. New shader selections default toHigh reasoning when
supported; explicit choices and the optional repair credit limit remain under
user control. These defaults can increase reservations/cost or elapsed time; the
quote uses the actual selected effort. The compiler service must be restarted
with local preview to load changed validation limits.

## v0.11.2 local timeouts

The owner's High-reasoning retry reached the application's240-second provider
cutoff before a completed project was received. Its result is unavailable; this
is not evidence of a shader compile failure or a provider token-limit stop.
Configured localhost development now allows600 seconds per shader provider pass.
Hosted shaders retain240 seconds and other artifact deadlines stay unchanged.

The local launcher preloads a non-retrying Undici dispatcher into the Next parent
and child workers, overriding lower headers/body timers to650 seconds. Explicit
per-service AbortSignals still bound calls sooner. The local Next proxy and route
maxDuration declaration allow1,500 seconds, covering two model passes plus native
checks. The declaration does not override hosting-provider limits. Long public
jobs still need a durable background-job design rather than relying on an HTTP
request remaining open.

This change does not increase the32,000 output-token ceiling or credit cap, add a
provider retry, recover a timed-out project, or establish that High reasoning will
finish within ten minutes. Existing failed-pass reservation refunds remain; a
client abort is not proof that upstream computation stopped. No paid model retry
was run for validation.

Transport reference checked23 October2026: [Undici dispatcher documentation](https://undici.nodejs.org/).

## v0.11.3 response-size boundaries

The owner's generic Service response exceeds the size limit error did not name
its reader. Shader provider replies previously had a400 KB envelope limit;
compiler responses had a100 KB limit. They now admit2 MB and600 KB respectively,
without raising150 KB shader source,32,000 output tokens or80 KB raw compiler
output. JSON escaping and provider envelope metadata are distinct from source.
The new errors identify provider transport versus compiler diagnostics and show
the configured ceiling. Oversized responses still fail without a hidden retry.
Regression fixtures verify all four adapters accept500 KB envelopes containing
unchanged valid source and reject replies above2 MB, including multibyte data.
Other artifacts retain400 KB. No paid model retry was run.

## v0.11.4 repair evidence and guidance

The owner generated AmberwaterIris with Luna/High, two reference images and one
optional repair. Logs show three initial failed programs: missing haze-setting
and inverse-matrix declarations. The repair fixed these but introduced duplicate
matrix declarations in terrain/water; the second check failed two programs and
correctly blocked a ZIP. The local request lasted about7.4 minutes. The retained
project has38 files (the UI reports667 lines); this is a failed AI repair, not an
unchanged AI success. Source and diagnostics were retained as designed.

New initial guidance teaches shared declaration ownership. Repair payloads now
instruct every provider to inspect expanded include dependencies and make minimal
coherent changes, rather than add a uniform to every consumer. Separate guards
on different libraries do not prevent duplicate declarations in one stage. Input
estimates include the exact checklist. No extra automatic attempt is added and
no broad GLSL-rewriting regex substitutes for compilation.

A separately named manual AmberwaterIris-repair-01 removes the duplicate matrix
declarations, moves shadow/buffer settings into GLSL metadata, and removes a
repeated shadow-space transform. Native driver validation passes28 stages/14
links, and the actual application validator/ZIP packager passes. This copy is
installed in Downloads and both test shaderpacks folders, while the original
failed source remains preserved. Iris integration, appearance and FPS are pending.
The prompt guidance is regression-tested for transport and accounting, not proven
by a new paid generation or claimed to guarantee future compile success.
