/** ModHorizon supported output layout, shared by prompting and validation.
 * This is a product allowlist, not a claim every entry runs on every target/version.
 */
export const SHADER_GBUFFERS_PROGRAMS = [
  "basic", "line", "textured", "textured_lit", "skybasic", "skytextured", "clouds",
  "terrain", "terrain_solid", "terrain_cutout", "damagedblock", "block", "block_translucent",
  "beaconbeam", "entities", "entities_glowing", "entities_translucent", "item", "armor_glint",
  "spidereyes", "hand", "hand_water", "weather", "water", "particles", "particles_translucent", "lightning",
] as const;

export const SHADER_PROGRAM_PATH = new RegExp(`^shaders/(?:world(?:-1|0|1)/)?(?:gbuffers_(?:${SHADER_GBUFFERS_PROGRAMS.join("|")})|shadow|(?:composite|deferred|shadowcomp|prepare|begin)\\d*|final)\\.(vsh|fsh)$`);

export const SHADER_PROGRAM_GUIDANCE = [
  `SUPPORTED FILENAMES — Use only paired .vsh/.fsh programs from this product layout: ${SHADER_GBUFFERS_PROGRAMS.map(name => `gbuffers_${name}`).join(", ")}; shadow; final; composite, deferred, shadowcomp, prepare or begin with an optional numeric suffix. Programs live directly under shaders/ or shaders/world-1/, shaders/world0/, shaders/world1/. Shared helper code belongs in .glsl includes, not invented executable program names.`,
  "The allowlist is a packaging boundary, not proof of target support: choose only entries documented for the selected runtime/version. For Iris 1.21.11, gbuffers_terrain_cutout covers cutout terrain; gbuffers_terrain_cutout_mip and gbuffers_terrain_cutout_mipped are not supported program names. A Minecraft render-layer label does not create a shader-program entrypoint. Preserve alpha testing and texture sampling in supported terrain/cutout programs. Do not blindly rename or merge existing passes without checking their code and interfaces.",
].join(" ");
