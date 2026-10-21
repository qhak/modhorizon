# Batch 1 — foundation, landing page and rewards UI

Completed 21 October 2026. Only Batch 1 is implemented. Original requirements: [Batch 1 brief](batch-1-brief.md).

## Changes

- `/` is the new dark landing page: compact responsive navigation, cinematic hero, illustrative workspace, capability status, workflow, pricing/rewards preview and final CTA.
- `/workspace` preserves the original prototype verbatim, including project history, model selection, generation, source inspection and downloads. All existing API paths and local-storage keys are unchanged.
- `src/app/landing.css` supplies scoped charcoal/graphite design tokens, restrained periwinkle accents, reusable buttons, precise borders and responsive layouts. No new application dependency or UI library.
- `HeroVideo` checks motion, reduced-data, Save-Data, slow-connection and mobile preferences before attaching a video URL. Mobile widths below 768px use the poster only. Changing preferences unloads the source. Background tabs pause playback. A keyboard-accessible pause/play button supplements the hidden native controls.
- `CreditFoundation` presents the proposed 5 signup credits and 25 verified-referral credits with an unconnected balance/progress state. It grants nothing and invents no account data.
- Sign in leads to an honest account-access explanation; authentication does not exist yet. CTAs open the current prototype. Planned platforms/features and the static workspace preview are explicitly identified.

## Hero assets

- User-supplied source: `Downloads/Untitled.mp4` (71,327,365 bytes, 2560×1440, 60fps, 21.32 seconds). Original retained in the Obsidian project assets, not duplicated in Git.
- `public/media/meteor-hero.mp4`: H.264, 1280×720, 24fps, approximately 20.29 seconds, 4,374,963 bytes (94% smaller). Audio removed; MP4 faststart enabled. A one-second end-to-start crossfade is baked into the footage for looping, with no CSS recreation.
- `public/media/meteor-poster.jpg`: real footage frame at 0.2 seconds, 1600×900, 196,438 bytes. Also remains behind the video if loading/playback fails.
- Playback: autoplay, muted, loop, playsInline, preload none, no native controls. No hero footage outside the hero.
- Footage is labelled as reference gameplay; no claim that ModHorizon generated the meteor mod. Ownership/licensing has not been independently established.
- Replace those two public assets to change the scene. Keep the originals outside the public bundle.

## Infrastructure inventory and preservation

Next.js 16 App Router, React 19, Tailwind 4 and the existing button component. Server-side provider adapters and build-service integration are preserved. Temporary server project storage and browser history remain unchanged. No production authentication, durable database, credit ledger, payment configuration or referral backend was found. No paid prices were invented. No changes to generation, compilation or download endpoints.

## Validation

- `npm run typecheck` and `npm run build`: pass.
- `npm test`: all 13 existing tests pass.
- No lint script/configuration is provided.
- Browser: desktop autoplay/mute/loop/no-controls confirmed; pause button confirmed; mobile menu confirmed; mobile source URL absent; widths 320, 390, 820 and 1280 reviewed without document overflow. CTA navigation to `/workspace` checked.
- Preference listeners reviewed in code; browser tooling did not emulate OS reduced-motion or Save-Data settings.
- [Mobile screenshot](batch-1-mobile.png), [workspace showcase screenshot](batch-1-workspace.png), [desktop hero screenshot](batch-1-desktop.png).

## Next batches

Batch 2: dashboard, navigation and project management, pending approval. Do not begin automatically.

Later referral backend: unique referral codes/links; signup attribution; first legitimate project verification on the server; atomic and idempotent ledger transactions; duplicate-account/self-referral prevention; reasonable anti-abuse checks and abuse-resistant claiming; preservation of paid balances. Never grant credits in the client or require Discord membership.

## Reference

[Kodari](https://kodari.ai/) reviewed 21 October 2026 for product clarity, prompt-to-build workflow, workspace demonstration and credit pricing presentation. ModHorizon uses original layout/copy and only user-provided gameplay assets; competitor claims and prices are not reused.
