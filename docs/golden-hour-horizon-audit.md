# GoldenHour horizon revision - 2026-10-25

The owner tested GoldenHourReflectiveHorizon-checked after one fresh Luna High
request with the same short realism prompt/two images. Native compilation passed
38 stages and 19 links, but the screenshot shows a dark water/horizon band,
flat stretched cloud detail, a tiny sun and strong orange haze. Visual acceptance
is pending; compilation did not establish a good reference match.

## Retained baseline and source defects

`shader-foundations/golden-hour-01` is the exact previously installed checked
source, including its disclosed viewport/world-up corrections. This is not the
untouched provider response. The original provider ZIP remains in local Downloads.
`golden-hour-02` is a separately labelled authored revision, generated reproducibly
by `scripts/shaders/build-golden-horizon.py`. Neither original ZIP is overwritten.

The old sky's `if (h < -0.04)` evaluates a partly blended night lower sky only
on one side of the cutoff. Actual GLSL samples immediately below/above the cutoff
show a colour jump greater than 0.05. The revised continuous blend is below 0.0001
for the same controlled samples. This establishes a source discontinuity, not
an Iris trace proving the whole screenshot band has only this cause.

Opaque terrain used a fixed 96/240-distance fog; water had no matching fade and
retained partial transparency at the far edge. It could reveal an unfogged bed
against a bright sky. The revision shares a fade based on the runtime `far`,
blending water toward the viewing sky and making alpha converge to one only at
long distance. It bypasses the added atmosphere underwater and preserves the
ordinary glass path. This hides the render boundary, not missing terrain.

## Appearance changes and preserved behavior

Bounded dome cloud coordinates replace reciprocal-height projection. Directional
density contrast provides cloud light/shade variation; this is an approximation,
not volumetric scattering. Vanilla clouds are disabled to avoid duplicate block
silhouettes. Sun disc radius increases from 0.0105 to 0.024 radians (stylized).
Sunset warmth is more directional/restrained; deep-water tint is slightly lifted.
No global exposure or block-lighting algorithm change. Reflection trace, water
height/normal algorithm, material classification, scene snapshot and composition
code are retained byte-for-byte where not listed in the builder. No material
textures, bloom or true volumetric clouds are introduced.

## Validation and next acceptance

Five native tests measure actual old/new sky continuity, finite day/night/rain
samples, far-water/viewing-sky agreement including alpha, near-water/underwater/
glass transparency, and isolation of reflection/wave/material source. Both actual
fragment code and controlled inputs are used; this is not a Minecraft scene.
38 stages compile and 19 programs link. 164 TypeScript tests/typecheck pass.
Archive entries are verified against the source before local installation.

Select **GoldenHourReflectiveHorizon-horizon02** with the same resource packs,
camera, sunset time and weather as the previous screenshot. Check band continuity,
sun/cloud appearance, near and far water, day/night/rain, and different render
distances. Check underwater entry and glass, then recognizable shoreline-object
reflections. New appearance and performance require owner feedback. No new model
call or production deployment was used. Generator context records the measured
horizon/alpha/binding lessons; it does not gain automatic visual evaluation.
