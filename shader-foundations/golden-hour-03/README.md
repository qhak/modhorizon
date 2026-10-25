# GoldenHourReflectiveHorizon - water03

Separate local water revision of horizon02; keep the same resource packs.
Sky, clouds, sun, terrain light and horizon helpers are byte-for-byte unchanged.
Reflection trace and wave/normal code are retained.

Water uses a depth-dependent neutral transmission coefficient with a Schlick
angular response (artist-selected base reflectance 0.035). Coverage and straight
RGB are constructed so SRC_ALPHA blending preserves the reflection contribution
while attenuating the bed once. Shallows stay clearer; deep water obscures more
bed/kelp. Water scatter is lit by existing lightmap/day response, not self-emission.
Far-water viewing-sky fade is unchanged. Ordinary glass follows its previous path.

This is neutral scalar absorption, not spectral light transport, refraction,
total internal reflection or a full multilayer transparency solution. Bed depth
is a view-ray optical-path approximation; missing geometry uses a 14-unit fallback.
Underwater atmosphere bypass remains, but underwater optics are not physically
complete. No new textures, volumetric effects or performance approval claimed.

Test same sunset camera first, then a shallow shore versus deep water; inspect
near-object reflections from low and downward angles. Check day/night, underwater
entry, glass beside water and the far horizon. Native tests are synthetic and
compilation does not establish Minecraft appearance. Original packs retained.
No model call or production deployment was used for this authored revision.
