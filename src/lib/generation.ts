import { randomUUID } from "node:crypto";
import { saveArtifact } from "./project-store";
import { validateProject } from "./validation";
import { selectGenerationSkills } from "./generation-skills";
import { expertFor, selectArtifactSkills } from "./artifact-experts";
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
  const project: Project = {
    id: randomUUID(),
    name: request.project?.name || `Untitled${request.artifactType}`,
    prompt: request.prompt,
    version: request.version,
    files: [],
    status: "failed",
    logs: [],
    artifactAvailable: false,
    provider: provider.name,
    modelId: request.modelId,
    artifactType: request.artifactType,
    target: request.target,
  };
  try {
    project.logs.push(
      `Generating ${expertFor(request.artifactType).label} source for Minecraft ${request.version} (${request.target}) using ${provider.name}${request.modelId ? ` · ${request.modelId}` : ""}.`,
    );
    const skills = [
      ...(request.artifactType === "plugin" ? selectGenerationSkills(request.prompt) : []),
      ...selectArtifactSkills(request),
    ];
    if (skills.length) project.logs.push(`Applied skills: ${skills.map((skill) => skill.label).join(", ")}.`);
    let generated = validateProject(await provider.generate(request), request.artifactType, request.target);
    project.name = generated.name;
    project.files = generated.files;
    if (request.artifactType !== "plugin") {
      project.status = "preview";
      project.logs.push(`${expertFor(request.artifactType).label} source preview created. This mode has no isolated ${request.target} packager or runtime validation yet; no installable artifact is available.`);
      return project;
    }
    if (!builder) {
      project.status = "preview";
      project.logs.push(
        "Source preview created. No isolated build service is configured; compilation has not run and no JAR is available.",
      );
      return project;
    }
    for (let attempt = 0; attempt <= 3; attempt++) {
      project.logs.push(
        attempt === 0
          ? "Submitting source to the isolated build service."
          : `Repair ${attempt}/3: compiling revised source.`,
      );
      const result = await builder.build(generated, request.version);
      project.logs.push(...result.logs);
      if (result.success) {
        if (!result.artifact?.length)
          throw new Error(
            "Build service reported success without an artifact.",
          );
        project.status = "success";
        project.artifactAvailable = true;
        project.logs.push(
          "Build succeeded. Test plugin behavior on a local Paper server before use.",
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
            { ...request, project: generated },
            result.logs,
          ),
          request.artifactType,
          request.target,
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
