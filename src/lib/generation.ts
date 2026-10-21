import { randomUUID } from "node:crypto";
import { saveArtifact } from "./project-store";
import { validateProject } from "./validation";
import { selectGenerationSkills } from "./generation-skills";
import { expertFor, selectArtifactSkills } from "./artifact-experts";
import { packageMinecraftPack } from "./packager";
import type {
  AIProvider,
  BuildService,
  GenerateRequest,
  Project,
} from "./types";

export async function generateArtifact(
  request: GenerateRequest,
  provider: AIProvider,
  builder?: BuildService,
): Promise<Project> {
  const artifactType = request.artifactType || "plugin";
  const target = request.target || "paper";
  const project: Project = {
    id: randomUUID(),
    name: request.project?.name || `Untitled${artifactType}`,
    prompt: request.prompt,
    version: request.version,
    files: [],
    status: "failed",
    logs: [],
    artifactAvailable: false,
    provider: provider.name,
    modelId: request.modelId,
    artifactType,
    target,
  };
  try {
    project.logs.push(
      `Generating ${expertFor(artifactType).label} source for Minecraft ${request.version} (${target}) using ${provider.name}${request.modelId ? ` · ${request.modelId}` : ""}.`,
    );
    const skills = [
      ...(artifactType === "plugin" ? selectGenerationSkills(request.prompt) : []),
      ...selectArtifactSkills(request),
    ];
    if (skills.length) project.logs.push(`Applied skills: ${skills.map((skill) => skill.label).join(", ")}.`);
    let generated = validateProject(await provider.generate({ ...request, artifactType, target }), artifactType, target);
    project.name = generated.name;
    project.files = generated.files;
    if (artifactType === "resource_pack" || artifactType === "shader_pack") {
      const packaged = packageMinecraftPack(generated, artifactType, request.version);
      project.files = packaged.files;
      project.status = "success";
      project.artifactAvailable = true;
      project.logs.push(`Created an installable ${expertFor(artifactType).label} ZIP (${packaged.artifact.length.toLocaleString()} bytes).`);
      if (artifactType === "resource_pack") project.logs.push(`Set pack metadata for Minecraft ${request.version} from the server's compatibility table.`);
      if (artifactType === "resource_pack") project.logs.push("This packager accepts text assets only; requested textures or other binary assets may still need to be added separately.");
      if (artifactType === "shader_pack") project.logs.push("ZIP packaging succeeded. GLSL compiler compatibility and GPU runtime behavior have not been checked.");
      saveArtifact(project, packaged.artifact);
      return project;
    }
    if (!builder) {
      project.status = "preview";
      project.logs.push(artifactType === "mod"
        ? `Mod source preview created. Configure an isolated build service that supports ${target} to compile a downloadable mod JAR.`
        : "Source preview created. No isolated Paper build service is configured; compilation has not run and no JAR is available.");
      return project;
    }
    for (let attempt = 0; attempt <= 3; attempt++) {
      project.logs.push(
        attempt === 0
          ? "Submitting source to the isolated build service."
          : `Repair ${attempt}/3: compiling revised source.`,
      );
      const result = await builder.build(generated, { version: request.version, artifactType, target });
      project.logs.push(...result.logs);
      if (result.success) {
        if (!result.artifact?.length)
          throw new Error(
            "Build service reported success without an artifact.",
          );
        project.status = "success";
        project.artifactAvailable = true;
        project.logs.push(
          artifactType === "plugin"
            ? "Plugin JAR built. Test plugin behavior on a local Paper server before use."
            : `Mod JAR built for ${target}. Test it in a disposable client/server matching the selected loader and Minecraft version.`,
        );
        saveArtifact(project, result.artifact);
        return project;
      }
      if (attempt < 3) {
        project.logs.push(
          `Compilation failed. Asking AI for repair ${attempt + 1}/3.`,
        );
        generated = validateProject(
          await provider.generate(
            { ...request, artifactType, target, project: generated },
            result.logs,
          ),
          artifactType,
          target,
        );
        project.name = generated.name;
        project.files = generated.files;
      }
    }
    throw new Error(
      "Compilation failed after three repair attempts. Review the build logs and revise your prompt.",
    );
  } catch (error) {
    project.error =
      error instanceof Error
        ? error.message
        : "Generation failed unexpectedly.";
    project.logs.push(project.error);
    return project;
  }
}

/** Backwards-compatible export for callers that explicitly generate Paper plugins. */
export const generatePlugin = generateArtifact;
