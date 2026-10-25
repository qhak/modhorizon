# BlocksLab candidate05 - clear sky

Keep BlocksLab-materials-04 enabled. Only the shader ZIP changes. Preserves the
owner's current grass/leaves/material maps and non-sky lighting/exposure controls.
Water algorithms are unchanged; their reflected sky and fog colours now match
the revised background, so water's appearance can change with the sky.

The earlier pipeline depended on the early begin output remaining in scene colour.
This candidate explicitly fills depth==1 background in the opaque snapshot and
composite, before translucent-layer mixing. It does not paint over terrain or
glass/water. The shared helper provides a bluer day palette, visible soft 2D
clouds, restrained sun/moon discs and a continuous warm sunset/lower horizon.
Vanilla clouds/celestial layers stay disabled to avoid duplicate rendering.
No volumetric scattering/clouds or stars; camera above clouds is not fully modeled.

Test day/sunset/night/rain at fixed camera; pan up and down and around the sun.
Check horizon seams, cloud visibility, terrain edges and reflected sky/glass.
Do not lower global exposure to judge the sky: blocks/material controls are
unchanged. Native synthetic tests are not Iris or full-scene visual acceptance.
New appearance needs owner feedback. No provider request was used.

Primary pipeline/depth references checked 2026-10-24:
https://shaders.properties/current/reference/programs/overview/
https://shaders.properties/current/reference/programs/deferred/
https://shaders.properties/current/guides/your-first-shaderpack/3_deferred_lighting/
