import type { PlatformId } from "./platforms";

import { MINECRAFT_RELEASES } from "./platform-versions";

/** Compatibility alias for the dashboard's supported game versions. */
export const MINECRAFT_VERSIONS: readonly MinecraftVersion[] = MINECRAFT_RELEASES;
/** A Minecraft release, or a proxy API version for proxy platforms. */
export type MinecraftVersion = string;
export type ArtifactType = "plugin" | "mod" | "resource_pack" | "shader_pack";
/** Plugins and mods target a platform from platforms.ts; packs target a game runtime. */
export type ArtifactTarget = PlatformId | "vanilla" | "iris" | "optifine";
export type TokenUsage = { inputTokens: number; outputTokens: number };
export type ReasoningLevel = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type ReasoningEffort = ReasoningLevel;
export type GeneratedFile = { path: string; content: string };
export type ReferenceAttachment = { name: string; type: string; data: string };
export type ShaderReport = {
  unfulfilledRequests?: string[];
  goal: string;
  referenceSummary: string;
  pipeline: string[];
  features: { name: string; kind: string; priority: number; status: "implemented" | "approximation" | "omitted"; technique: string; files: string[]; limitations: string; warnings?: string[] }[];
};
export type Project = {
  shaderReport?: ShaderReport;
  id: string;
  name: string;
  prompt: string;
  version: MinecraftVersion;
  files: GeneratedFile[];
  status: "preview" | "success" | "failed";
  logs: string[];
  artifactAvailable: boolean;
  provider: string;
  modelId?: string;
  reasoningEffort?: ReasoningEffort;
  artifactType: ArtifactType;
  target: ArtifactTarget;
  /** The model's note about what it built; may contain workspace commands from chat-commands.ts. */
  message?: string;
  creditsSpent?: number;
  error?: string;
};
export type GenerateRequest = {
  /** Transient references for this model pass; never copied into stored projects. */
  attachments?: ReferenceAttachment[];
  prompt: string;
  version: MinecraftVersion;
  /** Omitted by legacy callers; validated API requests always provide both fields. */
  artifactType?: ArtifactType;
  target?: ArtifactTarget;
  modelId?: string;
  reasoningEffort?: ReasoningEffort;
  project?: { name: string; files: GeneratedFile[] };
};
export type GeneratedProject = { name: string; files: GeneratedFile[]; message?: string; shaderReport?: ShaderReport; usage?: TokenUsage };
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
export interface BuildService {
  build(
    project: GeneratedProject,
    request: Pick<GenerateRequest, "version" | "artifactType" | "target"> | MinecraftVersion,
  ): Promise<BuildResult>;
}
