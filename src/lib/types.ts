import type { PlatformId } from "./platforms";

/** A Minecraft release, or a proxy API version for proxy platforms. */
export type MinecraftVersion = string;
export type GeneratedFile = { path: string; content: string };
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
  error?: string;
};
export type GenerateRequest = {
  prompt: string;
  platform: PlatformId;
  version: MinecraftVersion;
  modelId?: string;
  project?: { name: string; files: GeneratedFile[] };
};
export type GeneratedProject = { name: string; files: GeneratedFile[] };
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
