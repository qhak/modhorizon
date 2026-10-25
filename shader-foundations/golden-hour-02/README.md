# GoldenHourReflectiveHorizon - horizon02

Local authored revision of the AI-generated checked pack; original retained as
golden-hour-01. Fixes a measured lower-sky branch discontinuity and adds matching
render-distance haze to terrain/water. Water RGB and alpha approach viewing sky
at the far boundary; underwater path bypasses the added atmosphere. Deep water
tint is slightly lifted. Reflection tracing, wave normals and material mapping
are retained. No new texture assets or material lighting algorithms.

Bounded dome cloud coordinates and directional density contrast replace flat
streaks; vanilla clouds are disabled to avoid duplicate silhouettes. Sun disc is
larger and sunset saturation restrained. Clouds remain 2D, not volumetric light
transport. Far haze hides the render edge; it does not render missing terrain.

Native tests use controlled synthetic inputs, not an Iris session. Check the
same ocean camera at sunset, then day/night/rain and different render distances.
Pan through the lower horizon, test shoreline reflections, ordinary glass and
underwater transitions. No Minecraft appearance or performance approval claimed.
No provider call or production deployment was used for this revision.
