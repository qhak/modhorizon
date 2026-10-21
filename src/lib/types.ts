import type { PlatformId } from "./platforms";
import { MINECRAFT_RELEASES } from "./platform-versions";

/** A Minecraft release, or a proxy API version for proxy platforms. */
export type MinecraftVersion = string;
/** Compatibility alias for the first dashboard's supported game versions. */
export const MINECRAFT_VERSIONS: readonly string[] = MINECRAFT_RELEASES;
export type ArtifactType = "plugin" | "mod" | "resource_pack" | "shader_pack";
export type ArtifactTarget = "paper" | "fabric" | "forge" | "neoforge" | "vanilla" | "iris" | "optifine";
export type GeneratedFile = { path: string; content: string };
export type TokenUsage = { inputTokens: number; outputTokens: number };
export type ReasoningEffort = "light" | "standard" | "high" | "ultra";
export type Project = {
  id: string;
  name: string;
  prompt: string;
  /** Absent on projects saved before multi-platform support; treat as Paper. */
  platform?: PlatformId;
  version: MinecraftVersion;
  files: GeneratedFile[];
  status: "preview" | "success" | "failed";
  logs: string[];
  artifactAvailable: boolean;
  provider: string;
  modelId?: string;
  artifactType?: ArtifactType;
  reasoningEffort?: ReasoningEffort;
  target?: ArtifactTarget;
  creditsSpent?: number;
  error?: string;
};
export type GenerateRequest = {
  prompt: string;
  platform: PlatformId;
  version: MinecraftVersion;
  artifactType?: ArtifactType;
  target?: ArtifactTarget;
  modelId?: string;
  reasoningEffort?: ReasoningEffort;
  project?: { name: string; files: GeneratedFile[] };
};
export type GeneratedProject = { name: string; files: GeneratedFile[]; usage?: TokenUsage };
export type BuildResult = {
  success: boolean;
  logs: string[];
  artifact?: Uint8Array;
};
export interface AIProvider {
  name: string;
  generate(
    request: GenerateRequest,
    errors?: string[],
  ): Promise<GeneratedProject>;
}
export type BuildTarget = { platform: PlatformId; version: MinecraftVersion };
export interface BuildService {
  build(
    project: GeneratedProject,
    target: BuildTarget,
  ): Promise<BuildResult>;
}
