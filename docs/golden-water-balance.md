# GoldenHour water03 - 2026-10-25

Owner screenshot of horizon02 shows a smoother horizon, but deep water is dark
and underwater kelp dominates. The owner authorized work on water absorption,
transparency and reflectivity. Retain sky/clouds as the comparison baseline,
not as a claim of complete visual acceptance.

## Layer defect and change

Horizon02 first mixed a water tint with reflection, then blended that result over
the bed using largely fixed 0.34-0.60 opacity. The effective reflected contribution
was therefore reflection weight multiplied by that opacity, while much of the
bed remained visible even for deep water.

Water03 separates reflected radiance, neutral path transmission and lit water
scatter. With angle-dependent reflectance F and T=exp(-0.22*pathLength), set
A=1-(1-F)*T and P=F*reflection+(1-F)*(1-T)*scatter. Output straight RGB P/A and
alpha A for the existing SRC_ALPHA blend into the premultiplied overlay. Final
composition then leaves bed weight (1-F)*T. Guard division near zero. The base
reflectance 0.035 is an artistic choice; do not claim exact dielectric optics.

Bed/water depth uses the difference in view-ray distances instead of just axial
Z depth; absent opaque geometry retains the 14-unit fallback. Scatter uses revised
shallow/deep tints and existing day/lightmap lighting, not self-emission. Near
shallows can transmit more bed; deep water suppresses it. Surface glint, wave
height/normal code, SSR trace, block material mapping and glass path are retained.
Sky, clouds, lighting helpers, terrain and shared far-horizon fade remain unchanged.

This is scalar absorption, not spectral transport, refraction, total internal
reflection, volumetric water or complete overlapping-transparency handling.
Underwater atmosphere bypass remains; underwater optics are still approximate.

## Evidence and next test

Five native tests exercise actual GLSL: reflection/scatter/transmission composition
for controlled depths/angles, shallow versus deep coverage, grazing reflection
without old opacity suppression, full water-stage far-horizon/glass/underwater
behavior, and source isolation. Numeric layer tests are not Minecraft images.
The full pack compiles 38 stages and links 19 programs. 165 TypeScript tests and
typecheck pass. Context size remains bounded; source ZIP entries are verified.

Reproduce using scripts/shaders/build-golden-water.py, check_glsl.py,
tests/test_golden_water.py and package-specialists.ts. Select
GoldenHourReflectiveHorizon-water03 with the same resource packs, camera, time
and weather. Compare deep kelp visibility, a shallow shoreline, reflected nearby
tree/building at low/downward angles, sun glint, horizon, glass and underwater
entry; also test day/night. Stronger reflectivity alone does not establish
recognizable SSR quality. Sky/normal/trace algorithms were not rewritten.
New appearance and performance need owner feedback. No provider call or deployment.
The generator receives the layer-budget lesson, not a claim of a tested AI output.
