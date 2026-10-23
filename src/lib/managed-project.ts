import { MINECRAFT_VERSIONS, type ArtifactTarget, type ArtifactType, type MinecraftVersion, type Project } from "./types";
import { InputError, validateProject } from "./validation";
import { ARTIFACT_EXPERTS } from "./artifact-experts";
import { dataPackFormat } from "./datapack-versions";

export type LocalProfile = { displayName: string; credits: null; mode: "local" };
export type ManagedProject = {
  id: string; name: string; description: string; kind: ArtifactType; platform: ArtifactTarget;
  version: MinecraftVersion; createdAt: number; updatedAt: number; starred: boolean;
  revision: number; snapshot: Project | null; legacyId: string | null;
};
export type CreateProject = Pick<ManagedProject, "name" | "description" | "kind" | "platform" | "version">;
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected a JSON object.");
  return value as Record<string, unknown>;
}
export function projectName(value: unknown) {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 48 || /[\u0000-\u001f\u007f]/.test(value))
    throw new InputError("Use a project name between 1 and 48 characters, without control characters.");
  return value.trim();
}
export function validateCreation(value: unknown): CreateProject {
  const data = object(value);
  const kind = data.kind ?? "plugin";
  if (typeof kind !== "string" || !Object.hasOwn(ARTIFACT_EXPERTS, kind)) throw new InputError("Choose plugin, mod, resource_pack, shader_pack, or datapack.");
  const expert = ARTIFACT_EXPERTS[kind as ArtifactType];
  const platform = data.platform ?? (expert.targets.length === 1 ? expert.targets[0] : undefined);
  if (typeof platform !== "string" || !expert.targets.includes(platform as ArtifactTarget)) throw new InputError(`Choose a target for this ${expert.label.toLowerCase()}: ${expert.targets.join(", ")}.`);
  if (!MINECRAFT_VERSIONS.includes(data.version as MinecraftVersion)) throw new InputError("Choose a supported Minecraft version.");
  if (kind === "datapack" && !dataPackFormat(String(data.version))) throw new InputError("Datapacks need Minecraft 1.13 or newer.");
  if (data.description !== undefined && (typeof data.description !== "string" || data.description.length > 4000)) throw new InputError("Description must be at most 4,000 characters.");
  return { name: projectName(data.name), kind: kind as ArtifactType, platform: platform as ArtifactTarget, version: data.version as MinecraftVersion, description: (data.description as string | undefined)?.trim() ?? "" };
}
export function validateSnapshot(value: unknown): Project {
  const data = object(value);
  const artifactType = data.artifactType ?? "plugin";
  if (typeof artifactType !== "string" || !Object.hasOwn(ARTIFACT_EXPERTS, artifactType)) throw new InputError("Invalid source artifact type.");
  const expert = ARTIFACT_EXPERTS[artifactType as ArtifactType];
  const target = data.target ?? (expert.targets.length === 1 ? expert.targets[0] : undefined);
  if (typeof target !== "string" || !expert.targets.includes(target as ArtifactTarget)) throw new InputError("Invalid source artifact target.");
  const source = validateProject(data, artifactType as ArtifactType, target as ArtifactTarget, typeof data.version === "string" ? data.version : undefined);
  if (typeof data.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.id)) throw new InputError("Invalid source project ID.");
  if (!MINECRAFT_VERSIONS.includes(data.version as MinecraftVersion)) throw new InputError("Unsupported source version.");
  if (typeof data.prompt !== "string" || data.prompt.length > 4000 || typeof data.provider !== "string" || data.provider.length > 100) throw new InputError("Invalid source metadata.");
  if (!["preview", "success", "failed"].includes(data.status as string) || !Array.isArray(data.logs) || data.logs.length > 100 || data.logs.some(l => typeof l !== "string" || l.length > 2000)) throw new InputError("Invalid build status or logs.");
  return { ...source, id: data.id, prompt: data.prompt, version: data.version as MinecraftVersion, status: data.status as Project["status"], logs: data.logs, provider: data.provider,
    artifactType: artifactType as ArtifactType, target: target as ArtifactTarget,
    artifactAvailable: false, ...(typeof data.modelId === "string" && data.modelId.length <= 100 ? { modelId: data.modelId } : {}),
    ...(typeof data.error === "string" ? { error: data.error.slice(0, 2000) } : {}) };
}
