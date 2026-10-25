# ModHorizon history integration - 2026-10-25 / v0.15.0

Integrate default main 6f58b18 with shader branch12e6235 using a regular merge,
retaining all43 branch commits and the original main datapack/homepage commits.
This is a combined release, not renumbering previously published versions.

## Resolved conflicts

- Artifact experts keep datapack version/directory guidance alongside full shader
  response instructions and engineering context.
- Validation accepts datapack paths/schema/tags and keeps shader source/report/
  normalization/contracts, including historical incomplete-source handling.
- Generation uses expert buildMode for all ZIP artifacts, while shaders retain
  the local compiler gate, explicit optional repair credit limit and source-linked
  report. Datapacks bypass GLSL and Java builds, preserving versioned ZIP metadata.
- Public status derives its five artifact types from the catalog and includes
  shader compiler availability. Billing and compiler modules remain unchanged.
- Keep main's homepage screenshots/video fades, searchable30 examples, sample
  datapack download, catalog and all previously merged workspace changes.
- Preserve both historical changelog additions and the shader branch's local
  testing guide. Version0.15.0 identifies the actual combined release.
- Production build caught mixed legacy-byte encoding in shader-context.ts; repair
  only invalid UTF-8 bytes, preserving existing valid UTF-8. Add strict application
  source decoding regression so transpiler tolerance cannot hide another failure.

## Validation

174 TypeScript tests pass, including all datapack/shader suites and a combined
regression that checks datapacks bypass GLSL while failing shaders cannot publish
a ZIP. Typecheck and five native water regressions pass. Production app build and
Cloudflare bundle pass. Local HTTP smoke checks return200 for /, /create and
/pricing; /api/status lists all five types and the sample datapack ZIP is valid. No provider calls or explicit
production deployment command is part of this integration.

The first bundle attempt exposed the source encoding issue. A second app build
passed but bundling was blocked by Windows symbolic-link permissions when sharing
node_modules across worktrees. Copying dependencies physically into the isolated
checkout addresses that local harness issue; no production configuration workaround
or fake compiler behavior is introduced.

Independent read-only review confirmed datapack catalog/types/UI/validation/ZIP
behavior and shader billing/compiler/source-report boundaries remain connected.
Minecraft visual fidelity, live paid transactions and real production runtime are
not established by this integration. Other repos retain their own validation
records; PHYSIQ's preexisting external Workers Builds:callout failure remains a
separate unresolved hosting issue.
