# CleanSkyLab candidate 01

Separate sky experiment derived from Aurora candidate03. The only rendering
source change is skyRadiance in common.glsl: softer day/sunset palette, continuous
lower horizon, restrained sun/moon discs and a soft two-dimensional cloud layer.
This is not volumetric scattering or volumetric clouds. No stars are provided in
this first sky candidate. Vanilla sky/sun/moon/stars/clouds stay disabled to avoid
duplicate layers. Camera above the analytic cloud layer is not fully modeled.

Aurora's water algorithm and geometry lighting are unchanged; reflections use
the same revised sky as the background, so their colour necessarily changes.
Test fixed camera at day/sunset/night, facing toward/away from the sun, above and
below the horizon, rain, water reflections and underwater. Look for horizon seams,
sun rectangles, cloud popping or a mismatched reflected sky. Visual acceptance
and FPS are pending; inherited historical test evidence does not validate this.

Use ONE shader pack at a time. This requires no BlocksLab resource pack and is
not stacked with BlocksLab or Aurora. AuroraHorizon-candidate-03 remains the
owner's accepted water baseline. No provider request was made for this candidate.
