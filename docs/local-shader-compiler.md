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
