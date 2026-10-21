import {
  BUNGEECORD_VERSIONS,
  FABRIC_VERSIONS,
  FOLIA_VERSIONS,
  FORGE_VERSIONS,
  MINECRAFT_JAVA,
  MINECRAFT_RELEASES,
  NEOFORGE_VERSIONS,
  PAPER_VERSIONS,
  PURPUR_VERSIONS,
  QUILT_VERSIONS,
  SPIGOT_VERSIONS,
  SPONGE_VERSIONS,
  VELOCITY_VERSIONS,
} from "./platform-versions";

export { MINECRAFT_RELEASES };

export const PLATFORM_IDS = [
  "paper", "folia", "purpur", "spigot", "bukkit", "sponge",
  "velocity", "bungeecord",
  "fabric", "quilt", "forge", "neoforge",
] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

/** Projects sharing a family share a descriptor format and validation rules. */
export type PlatformFamily = "bukkit" | "sponge" | "velocity" | "bungeecord" | "fabric" | "quilt" | "forge" | "neoforge";
export type PlatformKind = "plugin" | "proxy" | "mod";
export type Mappings = "none" | "mojang" | "yarn" | "mcp";

export type Platform = {
  id: PlatformId;
  label: string;
  kind: PlatformKind;
  family: PlatformFamily;
  summary: string;
  /** Newest first. Minecraft releases, or proxy API versions for proxies. */
  versions: readonly string[];
  /** Implementation notes given to the model for this platform. */
  guidance: string;
  setupUrl: string;
};

export const PLATFORMS: Record<PlatformId, Platform> = {
  paper: {
    id: "paper", label: "Paper", kind: "plugin", family: "bukkit",
    summary: "The most popular high-performance server",
    versions: PAPER_VERSIONS,
    guidance: "Use the Paper API; Bukkit and Spigot APIs are available through it. Prefer Adventure components for player-facing text on 1.16.5 and newer.",
    setupUrl: "https://docs.papermc.io/paper/getting-started/",
  },
  folia: {
    id: "folia", label: "Folia", kind: "plugin", family: "bukkit",
    summary: "Paper with regionised multithreading",
    versions: FOLIA_VERSIONS,
    guidance: "Folia runs regions on separate threads. Never use the Bukkit scheduler; use the global, region, entity and async schedulers, touch entities and blocks only from their owning region, and set folia-supported: true in plugin.yml.",
    setupUrl: "https://papermc.io/downloads/folia",
  },
  purpur: {
    id: "purpur", label: "Purpur", kind: "plugin", family: "bukkit",
    summary: "Paper fork with extra configuration",
    versions: PURPUR_VERSIONS,
    guidance: "Use the Purpur API, a Paper fork; Paper, Spigot and Bukkit APIs are available through it.",
    setupUrl: "https://purpurmc.org/download/purpur",
  },
  spigot: {
    id: "spigot", label: "Spigot", kind: "plugin", family: "bukkit",
    summary: "The classic Bukkit-based server",
    versions: SPIGOT_VERSIONS,
    guidance: "Use only the Spigot API (org.spigotmc:spigot-api). Do not use Paper-only APIs such as Adventure components or Paper events.",
    setupUrl: "https://www.spigotmc.org/wiki/buildtools/",
  },
  bukkit: {
    id: "bukkit", label: "Bukkit", kind: "plugin", family: "bukkit",
    summary: "Plain Bukkit API for the widest compatibility",
    versions: SPIGOT_VERSIONS,
    guidance: "Use only the Bukkit API (org.bukkit:bukkit), with no Spigot or Paper extensions, so the plugin runs on every Bukkit-compatible server.",
    setupUrl: "https://www.spigotmc.org/wiki/buildtools/",
  },
  sponge: {
    id: "sponge", label: "Sponge", kind: "plugin", family: "sponge",
    summary: "SpongeAPI plugins for SpongeVanilla and SpongeForge",
    versions: SPONGE_VERSIONS,
    guidance: "Use the SpongeAPI release that matches this Minecraft version. For API 8 and newer, annotate the main class with @Plugin and declare it in META-INF/sponge_plugins.json; for API 7 and older, use the @Plugin annotation with id, name and version plus mcmod.info.",
    setupUrl: "https://spongepowered.org/downloads",
  },
  velocity: {
    id: "velocity", label: "Velocity", kind: "proxy", family: "velocity",
    summary: "Modern proxy that links servers together",
    versions: VELOCITY_VERSIONS,
    guidance: "Write a Velocity proxy plugin. Annotate the main class with @Plugin, inject ProxyServer and Logger with @Inject, subscribe to events with @Subscribe, register commands through the CommandManager, and include velocity-plugin.json with id, name, version and main.",
    setupUrl: "https://docs.papermc.io/velocity/getting-started/",
  },
  bungeecord: {
    id: "bungeecord", label: "BungeeCord", kind: "proxy", family: "bungeecord",
    summary: "The original Minecraft proxy",
    versions: BUNGEECORD_VERSIONS,
    guidance: "Write a BungeeCord proxy plugin. Extend net.md_5.bungee.api.plugin.Plugin, register listeners and commands through the PluginManager, and declare name, main, version and author in bungee.yml.",
    setupUrl: "https://www.spigotmc.org/wiki/bungeecord-installation/",
  },
  fabric: {
    id: "fabric", label: "Fabric", kind: "mod", family: "fabric",
    summary: "Lightweight mod loader with fast updates",
    versions: FABRIC_VERSIONS,
    guidance: "Write a Fabric mod using Fabric Loader and Fabric API. Declare entrypoints, environment and dependencies in fabric.mod.json. Prefer Fabric API events and registries over mixins; when a mixin is unavoidable keep it small and declare it in a <modid>.mixins.json file.",
    setupUrl: "https://fabricmc.net/use/installer/",
  },
  quilt: {
    id: "quilt", label: "Quilt", kind: "mod", family: "quilt",
    summary: "Community fork of Fabric",
    versions: QUILT_VERSIONS,
    guidance: "Write a Quilt mod using Quilt Loader and Quilted Fabric API. Declare the mod in quilt.mod.json with quilt_loader.id, version and entrypoints. Prefer API events over mixins; declare any mixin in a <modid>.mixins.json file.",
    setupUrl: "https://quiltmc.org/en/install/",
  },
  forge: {
    id: "forge", label: "Forge", kind: "mod", family: "forge",
    summary: "The long-running mod loader, back to 1.1",
    versions: FORGE_VERSIONS,
    guidance: "Write a Minecraft Forge mod. For 1.13 and newer, annotate the main class with @Mod, use deferred registers and the event bus, and declare the mod in META-INF/mods.toml. For 1.12.2 and older, use the @Mod annotation with FML lifecycle events and declare the mod in mcmod.info.",
    setupUrl: "https://files.minecraftforge.net/",
  },
  neoforge: {
    id: "neoforge", label: "NeoForge", kind: "mod", family: "neoforge",
    summary: "Modern community fork of Forge",
    versions: NEOFORGE_VERSIONS,
    guidance: "Write a NeoForge mod. Annotate the main class with @Mod, take the mod event bus in the constructor, use DeferredRegister for content, and declare the mod in META-INF/neoforge.mods.toml (META-INF/mods.toml for 1.20.4 and older).",
    setupUrl: "https://neoforged.net/",
  },
};

export const PLATFORM_GROUPS: { kind: PlatformKind; label: string; ids: PlatformId[] }[] = [
  { kind: "plugin", label: "Server plugins", ids: ["paper", "folia", "purpur", "spigot", "bukkit", "sponge"] },
  { kind: "proxy", label: "Proxy plugins", ids: ["velocity", "bungeecord"] },
  { kind: "mod", label: "Mods", ids: ["fabric", "quilt", "forge", "neoforge"] },
];

export const DEFAULT_PLATFORM: PlatformId = "paper";

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && (PLATFORM_IDS as readonly string[]).includes(value);
}

export function platformOf(id: string | undefined): Platform {
  return isPlatformId(id) ? PLATFORMS[id] : PLATFORMS[DEFAULT_PLATFORM];
}

/** Numeric comparison of dotted versions; suffixes such as "-R0.4" are ignored. */
export function compareVersions(left: string, right: string): number {
  const parse = (value: string) => value.split("-")[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/** Groups versions by release line, such as 1.21 or 26.1, keeping newest first. */
export function versionLines(versions: readonly string[]): { line: string; versions: string[] }[] {
  const lines: { line: string; versions: string[] }[] = [];
  for (const version of versions) {
    const line = version.split("-")[0].split(".").slice(0, 2).join(".");
    const last = lines.at(-1);
    if (last?.line === line) last.versions.push(version);
    else lines.push({ line, versions: [version] });
  }
  return lines;
}

const VELOCITY_JAVA: Record<string, number> = { "4": 25, "3.5": 21, "3.4": 17, "3.1": 11 };

/** Minimum Java the target runtime requires; the build service compiles with this JDK. */
export function javaVersionFor(platform: PlatformId, version: string): number {
  if (platform === "velocity")
    return VELOCITY_JAVA[version.split(".")[0]] ?? VELOCITY_JAVA[version.split(".").slice(0, 2).join(".")] ?? 25;
  // BungeeCord API jars are compiled for Java 8 in every published release.
  if (platform === "bungeecord") return 8;
  return MINECRAFT_JAVA[version] ?? 8;
}

/** Mapping names the generated mod source must use, matching the build template. */
export function mappingsFor(platform: PlatformId, version: string): Mappings {
  const { family } = PLATFORMS[platform];
  if (family === "fabric" || family === "quilt")
    return compareVersions(version, "1.14.4") >= 0 ? "mojang" : "yarn";
  if (family === "forge") return compareVersions(version, "1.17") >= 0 ? "mojang" : "mcp";
  if (family === "neoforge") return "mojang";
  return "none";
}

export function supportsVersion(platform: PlatformId, version: string): boolean {
  return PLATFORMS[platform].versions.includes(version);
}

export function describeTarget(platform: PlatformId, version: string): string {
  const { label, kind } = PLATFORMS[platform];
  return kind === "proxy" ? `${label} ${version}` : `${label} for Minecraft ${version}`;
}

/** Why a platform launched where it did; used when a version predates it. */
const ORIGINS: Partial<Record<PlatformId, string>> = {
  fabric: "Fabric launched alongside Minecraft 1.14 in 2019, so there is no Fabric loader for anything older.",
  quilt: "Quilt is built on Fabric's toolchain and only supports the Minecraft releases that toolchain covers.",
  neoforge: "NeoForge split off from Forge in July 2023, starting at Minecraft 1.20.1. Older versions only exist on Forge.",
  folia: "Folia was introduced with Minecraft 1.19.4. Its region-threaded server does not exist for earlier releases.",
  purpur: "Purpur is a fork of Paper that started during the 1.14 era, so it has no builds for older versions.",
  paper: "Paper's oldest published build is for 1.7.10. Earlier servers predate the project.",
  spigot: "Spigot's BuildTools can only build 1.8 and newer. Older versions were never made available.",
  bukkit: "The Bukkit API is only published through Spigot's BuildTools, which starts at 1.8.",
  sponge: "SpongeVanilla's oldest build targets 1.8. Earlier versions predate the project.",
};

export type Incompatibility = {
  title: string;
  reason: string;
  /** Closest version this platform does support. */
  nearest?: string;
  /** Platforms of the same kind (or any kind, as a fallback) that support the version. */
  alternatives: PlatformId[];
};

export function incompatibility(platform: PlatformId, version: string): Incompatibility | null {
  const { label, kind, versions } = PLATFORMS[platform];
  if (versions.includes(version)) return null;
  if (kind === "proxy")
    return { title: `${label} ${version} is not a published API version.`, reason: `Choose one of the ${label} API releases listed.`, nearest: versions[0], alternatives: [] };

  const supporters = PLATFORM_IDS.filter((id) => PLATFORMS[id].kind !== "proxy" && PLATFORMS[id].versions.includes(version));
  const sameKind = supporters.filter((id) => PLATFORMS[id].kind === kind);
  const alternatives = sameKind.length ? sameKind : supporters;
  const title = `${label} can't be used with Minecraft ${version}.`;
  if (!supporters.length) {
    const covered = MINECRAFT_RELEASES.filter((release) =>
      PLATFORM_IDS.some((id) => PLATFORMS[id].kind !== "proxy" && PLATFORMS[id].versions.includes(release)),
    );
    const earliest = covered.at(-1)!;
    const next = [...covered].reverse().find((release) => compareVersions(release, version) > 0);
    return {
      title,
      reason: compareVersions(version, earliest) < 0
        ? `None of the supported loaders reach back to Minecraft ${version}. The oldest release any of them supports is ${earliest}.`
        : `No server platform or mod loader ever published a stable build for Minecraft ${version}. They all skipped it, so projects target ${next} instead.`,
      nearest: nearestVersion(versions, version),
      alternatives,
    };
  }

  const oldest = versions.at(-1)!;
  const reason =
    compareVersions(version, oldest) < 0
      ? ORIGINS[platform] ?? `${label} supports Minecraft ${oldest} and newer, and ${version} came out before ${label} did.`
      : `${label} never released a stable build for Minecraft ${version}. Projects compile against one exact release, and ${label} ${platform === "folia" ? "only follows selected releases" : "skipped this one"}.`;
  return { title, reason, nearest: nearestVersion(versions, version), alternatives };
}

/** Picks the supported version closest to the requested one by release order. */
function nearestVersion(versions: readonly string[], version: string): string | undefined {
  const order = (value: string) => MINECRAFT_RELEASES.indexOf(value as (typeof MINECRAFT_RELEASES)[number]);
  const target = order(version);
  return [...versions].sort((left, right) => Math.abs(order(left) - target) - Math.abs(order(right) - target))[0];
}
