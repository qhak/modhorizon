import type { PlatformId } from "./platforms";

/** The 1.21.x releases the dashboard offers. Generation accepts every release listed in platforms.ts. */
export const MINECRAFT_VERSIONS: readonly MinecraftVersion[] = [
  "1.21.1",
  "1.21.2",
  "1.21.3",
  "1.21.4",
  "1.21.5",
  "1.21.6",
  "1.21.7",
  "1.21.8",
  "1.21.9",
  "1.21.10",
  "1.21.11",
];
/** A Minecraft release, or a proxy API version for proxy platforms. */
export type MinecraftVersion = string;
export type ArtifactType = "plugin" | "mod" | "resource_pack" | "shader_pack";
/** Plugins and mods target a platform from platforms.ts; packs target a game runtime. */
export type ArtifactTarget = PlatformId | "vanilla" | "iris" | "optifine";
export type TokenUsage = { inputTokens: number; outputTokens: number };
export type ReasoningLevel = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type ReasoningEffort = ReasoningLevel;
export type GeneratedFile = { path: string; content: string };
export type Project = {
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
  prompt: string;
  version: MinecraftVersion;
  /** Omitted by legacy callers; validated API requests always provide both fields. */
  artifactType?: ArtifactType;
  target?: ArtifactTarget;
  modelId?: string;
  reasoningEffort?: ReasoningEffort;
  project?: { name: string; files: GeneratedFile[] };
};
export type GeneratedProject = { name: string; files: GeneratedFile[]; message?: string; usage?: TokenUsage };
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
