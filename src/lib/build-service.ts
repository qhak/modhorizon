import { limitedJson, trustedEndpoint } from "./ai-provider";
import type { BuildResult, BuildService, GeneratedProject, GenerateRequest } from "./types";

export const MAX_ARTIFACT_BYTES = 5_000_000;

export class RemoteBuildService implements BuildService {
  async build(
    project: GeneratedProject,
    input: Pick<GenerateRequest, "version" | "artifactType" | "target"> | GenerateRequest["version"],
  ): Promise<BuildResult> {
    const request = typeof input === "string"
      ? { version: input, artifactType: "plugin" as const, target: "paper" as const }
      : { version: input.version, artifactType: input.artifactType || "plugin", target: input.target || "paper" };
    if (request.artifactType !== "plugin" && request.artifactType !== "mod")
      throw new Error("The isolated JAR build service only accepts plugins and mods.");
    const endpoint = process.env.BUILD_SERVICE_URL;
    const token = process.env.BUILD_SERVICE_TOKEN;
    if (!endpoint || !token)
      throw new Error(
        "Configure BUILD_SERVICE_URL and BUILD_SERVICE_TOKEN for an isolated build service that supports this artifact type and loader.",
      );
    const response = await fetch(
      trustedEndpoint(endpoint, "BUILD_SERVICE_URL"),
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(120_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schemaVersion: request.artifactType === "mod" ? 2 : 1,
          ...(request.artifactType === "mod" ? { artifactType: "mod" } : {}),
          platform: request.target,
          javaVersion: 21,
          minecraftVersion: request.version,
          project,
        }),
      },
    );
    if (!response.ok)
      throw new Error(`Build service unavailable (HTTP ${response.status}).`);
    const raw = (await limitedJson(response, 7_000_000)) as Record<
      string,
      unknown
    >;
    if (
      typeof raw.success !== "boolean" ||
      !Array.isArray(raw.logs) ||
      raw.logs.length > 100 ||
      !raw.logs.every((line) => typeof line === "string" && line.length <= 2000)
    )
      throw new Error("Build service returned an invalid result.");
    const logs = raw.logs as string[];
    if (!raw.success) return { success: false, logs };
    if (
      typeof raw.artifactBase64 !== "string" ||
      raw.artifactBase64.length > 6_666_668 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(raw.artifactBase64)
    )
      throw new Error("Build service returned an invalid artifact.");
    const artifact = Buffer.from(raw.artifactBase64, "base64");
    if (
      artifact.length > MAX_ARTIFACT_BYTES ||
      artifact.length < 4 ||
      artifact[0] !== 0x50 ||
      artifact[1] !== 0x4b ||
      artifact[2] !== 3 ||
      artifact[3] !== 4
    )
      throw new Error("Build service returned an invalid JAR archive.");
    return { success: true, logs, artifact };
  }
}

export function createBuildService(): BuildService | undefined {
  if (!process.env.BUILD_SERVICE_URL && process.env.NODE_ENV !== "production")
    return undefined;
  return new RemoteBuildService();
}
