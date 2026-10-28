# Generation reference guidance

ModHorizon supplies short, server-owned reference cards to the selected model
when generating or editing a project. These are prompt context, not fine-tuning,
training data, dynamically fetched pages, independently running agents or a
guarantee of quality. The user prompt and uploaded files cannot add cards.

## Selection and boundaries

- `src/lib/references/` contains original task guidance with source provenance,
  explicit target/version applicability and evidence labels. Sources are not
  fetched at request time. Illustrative flows are not runnable projects.
- `generationReferenceContext` selects the applicable baseline plus relevant
  cards matched to the prompt, prioritizing explicit focus cues. Image references
  also select visual-reference guidance when applicable. The selection uses a
  bounded number of whole cards and characters: up to four for economy models,
  five for balanced, six for advanced/frontier, with 7,000 or 12,000 characters
  for the serialized cards. The approach is more focused for economy models and
  encourages broader interface and lifecycle checks for advanced models. These
  are heuristics, not measured model-specific optimizations.
- Context is passed through the same provider request builder used for input
  estimates and credit reservations. More context can increase token use and
  cost. Existing model access restrictions and output limits still apply.
- Each returned project log lists selected reference titles. Selection does not
  prove that a model followed the guidance, that a build passed or that the output
  works in Minecraft. The system asks models to disclose unsupported features.

## Coverage

**Plugins:** Target-specific baselines include Bukkit-family servers, Folia,
Sponge, Velocity and BungeeCord. Paper-style cards cover commands and permissions,
event and task lifecycles, minigame states, inventories and persistent data. The
Paper 1.21.4 zombie-speed excerpt comes from the repository's fixed example and
has passed local offline compilation; that check does not establish gameplay.
Folia has separate region and entity scheduler guidance.

**Mods:** Fabric, Quilt, legacy and modern Forge, and NeoForge receive separate
loader baselines. Cross-loader cards cover registration, client/server separation,
events, network trust and lifecycle. The current generator restricts mod resources
and does not provide a production loader-specific build worker. These are
engineering guidance, not verified complete mod projects or proof that a mod JAR
can be built, installed or played.

**Datapacks:** Version-aware guidance covers namespaced structure, the 1.21
directory change, per-player scores, schedules, recipes, loot, world changes and
installation. The fixed repository example is structural evidence, not a blanket
claim of command correctness or in-game behavior for newly generated packs.

**Resource packs:** Cards cover supported diamond-tool recolor and ore recipes,
version-scoped client model guidance and text assets. Generated binary artwork,
arbitrary textures and unsupported effects remain outside the current pipeline.
The owner previously reported one cherry-tool pack working; that does not validate
new outputs, unsupported art or every version.

**Shaders:** Cards add guidance for pipeline contracts, visual references,
performance and follow-up preservation. Iris-specific water, sky, shadow and
material guidance is limited to the checked 1.21.11 context; cross-target cards
do not imply Iris-specific features work on OptiFine. The existing source excerpt
and shader skill systems remain in place. Compiling GLSL is not Iris/OptiFine
runtime, visual or FPS acceptance.

## Evaluation before claiming quality improvements

Compare the pre-reference version with this version using the same model,
reasoning level, target, version, prompt and test environment. Record the actual
provider input/output tokens, settled credits, build attempts, source and result;
repeat runs where the owner authorizes provider spending. Keep a separate prompt
set for evaluation rather than tuning every card to one example. Record quality
and cost, including failures and repairs; no model-comparison result is claimed yet.

Suggested acceptance cases:

1. **Paper 1.21.4:** TeamArena initial generation and a follow-up change. Test
   two players, missing setup, countdown, death, disconnect, winner, restart,
   permissions and preservation of existing features.
2. **Fabric/Forge/NeoForge:** version-specific item or gameplay event. Check
   metadata, loader APIs, server/client separation and honest omissions first;
   compile and play only once the matching isolated builder and test environment
   exist. Do not count source validation as a working mod.
3. **Datapack:** per-player mining reward with a reload and two-player test;
   separately test a recipe on supported pre-1.21 and 1.21+ releases.
4. **Resource pack:** supported diamond-tool recolor, then high-contrast ore.
   Check packaged PNGs and visual result in the selected supported version, plus
   an unsupported artwork request that should be disclosed rather than invented.
5. **Shader:** water/sky reference and a targeted follow-up. Check source and
   compilation separately from actual Iris/OptiFine load, fixed-scene visual
   comparison, image fidelity, day/night, glass/underwater and performance.
