import type { ArtifactTarget, ArtifactType } from "./types";

export const EXAMPLE_CATEGORIES = [
  { id: "plugin", label: "Plugins" }, { id: "mod", label: "Mods" },
  { id: "datapack", label: "Datapacks" }, { id: "resource_pack", label: "Resource packs" },
  { id: "shader_pack", label: "Shaders" },
] as const;

export type CreationExample = { title: string; type: ArtifactType; target: ArtifactTarget; version: string; prompt: string };

export const CREATION_EXAMPLES: readonly CreationExample[] = [
  { title: "Zombie sprint", type: "plugin", target: "paper", version: "1.21.4", prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie." },
  { title: "Ruby gear", type: "mod", target: "fabric", version: "1.21.4", prompt: "Create a Fabric mod that adds a ruby ingot, ruby ore and a ruby sword stronger than iron. Include registration, language entries and recipes; describe texture assets that need to be supplied separately." },
  { title: "Your first function", type: "datapack", target: "vanilla", version: "1.21.4", prompt: "Create a Minecraft Java datapack with a manual function called welcome:hello that shows the executing player a colorful welcome message. Include installation steps and the exact function command." },
  { title: "The Nightfall Blade", type: "resource_pack", target: "vanilla", version: "1.21.4", prompt: "Create a text-only resource pack that renames the diamond sword to Nightfall Blade in en_us.json and adds a purple-themed pack description. Do not claim to include new textures." },
  { title: "Golden hour", type: "shader_pack", target: "iris", version: "1.21.4", prompt: "Create a minimal Iris shader pack with warm sunset color grading. Include matching vertex and fragment stages, simple adjustable strength and a README with compatibility assumptions." },
  { title: "A place to call home", type: "plugin", target: "paper", version: "1.21.4", prompt: "Create a Paper plugin with /sethome and /home commands, one saved home per player, a 5-second teleport delay cancelled by movement, and configurable messages." },
  { title: "A useful backpack", type: "mod", target: "neoforge", version: "1.21.4", prompt: "Create a NeoForge mod with a backpack item that opens a 27-slot inventory and preserves its contents. Keep the inventory authoritative on the server and document client/server installation." },
  { title: "One-time starter supplies", type: "datapack", target: "vanilla", version: "1.21.4", prompt: "Create a datapack with /function starter:claim that gives a player a small stone tool kit only once, tracked by a scoreboard. Initialize the objective on load and explain how to test it." },
  { title: "A friendly item dictionary", type: "resource_pack", target: "vanilla", version: "1.21.4", prompt: "Create a text-only resource pack with playful English display names for the compass, clock, spyglass and recovery compass. Preserve all unrelated language keys." },
  { title: "A softer distance", type: "shader_pack", target: "iris", version: "1.21.4", prompt: "Create an Iris shader pack focused on gentle distance fog with adjustable density and color. Keep the shader lightweight and document the passes and uniforms it expects." },
  { title: "Welcome starter kit", type: "plugin", target: "folia", version: "1.21.4", prompt: "Create a Folia plugin that gives first-time players a stone tool kit and welcome title. Save whether a player has received the kit and use Folia's appropriate entity scheduler." },
  { title: "Rain-fed crops", type: "mod", target: "fabric", version: "1.21.4", prompt: "Create a Fabric mod that gives crops an extra growth opportunity during rain only when the crop is exposed to the sky. Keep tick work bounded and preserve vanilla crop behavior." },
  { title: "Craftable saddles", type: "datapack", target: "vanilla", version: "1.21.4", prompt: "Create a Minecraft Java 1.21.4 datapack adding a shaped saddle recipe made from leather and iron ingots. Include valid version-specific recipe JSON and clear installation instructions." },
  { title: "French tool names", type: "resource_pack", target: "vanilla", version: "1.21.4", prompt: "Create a text-only resource pack with custom French names for all diamond tools in fr_fr.json and a matching English translation in en_us.json." },
  { title: "Clean color grading", type: "shader_pack", target: "optifine", version: "1.21.4", prompt: "Create a minimal OptiFine shader pack with adjustable saturation and contrast, consistent vertex/fragment interfaces, and no expensive lighting passes." },
  { title: "A menu of warps", type: "plugin", target: "spigot", version: "1.21.4", prompt: "Create a Spigot plugin with a /warps inventory menu populated from config.yml. Check permission for each warp and teleport players only to valid configured locations." },
  { title: "A safer return", type: "mod", target: "neoforge", version: "1.21.4", prompt: "Create a NeoForge mod with a craftable return charm that teleports a player to their respawn point, consumes one charge and has a 60-second cooldown." },
  { title: "A better dungeon chest", type: "datapack", target: "vanilla", version: "1.21.4", prompt: "Create a datapack with a custom loot table called explorer:cache containing useful early-game supplies. Do not replace vanilla loot tables. Document how to test it with the loot command." },
  { title: "A treasure hunt theme", type: "resource_pack", target: "vanilla", version: "1.21.4", prompt: "Create a text-only resource pack that renames emeralds, maps and the compass for a treasure hunt. Include a concise themed description and installation steps." },
  { title: "Moonlit nights", type: "shader_pack", target: "iris", version: "1.21.4", prompt: "Create a simple Iris shader pack with subtle cool night-time color grading while retaining readable dark areas. Include a setting for the effect strength." },
  { title: "A small daily reward", type: "plugin", target: "paper", version: "1.21.4", prompt: "Create a Paper plugin with /daily that gives three emeralds once every 24 hours per player, saves claim times across restarts, and shows the remaining cooldown." },
  { title: "A quieter HUD", type: "mod", target: "fabric", version: "1.21.4", prompt: "Create a client-only Fabric mod with a configurable keybind to toggle a small coordinates HUD. Isolate client rendering from dedicated server code." },
  { title: "An explorer's milestone", type: "datapack", target: "vanilla", version: "1.21.4", prompt: "Create a datapack with a custom advancement for entering the Nether that rewards the player with a small amount of experience. Include version-correct advancement JSON." },
  { title: "A server's signature gear", type: "resource_pack", target: "vanilla", version: "1.21.4", prompt: "Create a text-only resource pack that gives the netherite sword, chestplate and boots consistent astronomy-inspired English names. Include only valid metadata and language JSON." },
  { title: "A retro palette", type: "shader_pack", target: "optifine", version: "1.21.4", prompt: "Create a lightweight OptiFine shader pack with optional posterized color grading and an adjustable number of color steps. Avoid extra world rendering passes." },
  { title: "Classic kit PvP", type: "plugin", target: "spigot", version: "1.8.8", prompt: "Create a Spigot 1.8.8 kit PvP plugin with /kit, three configurable kits and a per-player cooldown. Use only APIs available in 1.8.8." },
  { title: "Old-school mining", type: "mod", target: "forge", version: "1.12.2", prompt: "Create a Forge 1.12.2 mod with a craftable obsidian pickaxe. Use the correct legacy registration and metadata, include a recipe and language entry, and list required texture files." },
  { title: "A world welcome message", type: "datapack", target: "vanilla", version: "1.20.4", prompt: "Create a Minecraft Java 1.20.4 datapack that displays a welcome message once per player when they first join, using a scoreboard and a lightweight tick function. Use legacy plural datapack directories." },
  { title: "Winter words", type: "resource_pack", target: "vanilla", version: "1.21.4", prompt: "Create a text-only resource pack with winter-themed English names for snowballs, packed ice, blue ice and leather boots, without changing item behavior or claiming visual changes." },
  { title: "A little cinematic warmth", type: "shader_pack", target: "iris", version: "1.21.4", prompt: "Create a minimal Iris post-processing shader with mild warm color grading and an optional subtle vignette. Expose settings and describe GPU testing limitations." },
];

export function exampleHref(example: CreationExample) {
  const query = new URLSearchParams({ type: example.type, version: example.version, prompt: example.prompt });
  if (example.type === "plugin" || example.type === "mod") query.set("platform", example.target);
  return `/create?${query}`;
}
