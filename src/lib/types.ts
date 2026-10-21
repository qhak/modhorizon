export const MINECRAFT_VERSIONS = [
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
] as const;
export type MinecraftVersion = (typeof MINECRAFT_VERSIONS)[number];
export type ArtifactType = "plugin" | "mod" | "resource_pack" | "shader_pack";
export type ArtifactTarget = "paper" | "fabric" | "forge" | "neoforge" | "vanilla" | "iris" | "optifine";
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
  artifactType: ArtifactType;
  target: ArtifactTarget;
  error?: string;
};
export type GenerateRequest = {
  prompt: string;
  version: MinecraftVersion;
  artifactType: ArtifactType;
  target: ArtifactTarget;
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
export interface BuildService {
  build(
    project: GeneratedProject,
    version: MinecraftVersion,
  ): Promise<BuildResult>;
}
