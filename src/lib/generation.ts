import { randomUUID } from "node:crypto";
import { saveArtifact } from "./project-store";
import { validateProject } from "./validation";
import { selectGenerationSkills } from "./generation-skills";
import { expertFor, selectArtifactSkills, usesBukkitApi } from "./artifact-experts";
import { packageMinecraftPack, resourcePackFormat } from "./packager";
import { recognizedShaderLook } from "./shader-adaptation";
import { PLATFORMS, describeTarget, isPlatformId } from "./platforms";
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
    const model = `${provider.name}${request.modelId ? ` · ${request.modelId}` : ""}`;
    if (request.attachments?.length)
      project.logs.push(`Using ${request.attachments.length} reference attachment(s) for this generation pass. References are not retained with project history.`);
    project.logs.push(
      isPlatformId(target)
        ? `Generating ${describeTarget(target, request.version)} source using ${model}.`
        : `Generating ${expertFor(artifactType).label} source for Minecraft ${request.version} (${target}) using ${model}.`,
    );
    const skills = [
      ...(usesBukkitApi({ artifactType, target }) ? selectGenerationSkills(request.prompt) : []),
      ...selectArtifactSkills({ ...request, artifactType, target }),
    ];
    if (skills.length) project.logs.push(`Applied skills: ${skills.map((skill) => skill.label).join(", ")}.`);
    let generated = validateProject(await provider.generate({ ...request, artifactType, target }), artifactType, target, request.version);
    project.name = generated.name;
    project.files = generated.files;
    project.message = generated.message;
    if (generated.shaderReport) project.shaderReport = generated.shaderReport;
    if (artifactType === "resource_pack" || artifactType === "shader_pack") {
      const packaged = packageMinecraftPack(generated, artifactType, request.version);
      project.files = packaged.files;
      project.status = "success";
      project.artifactAvailable = true;
      project.logs.push(`Created an installable ${expertFor(artifactType).label} ZIP (${packaged.artifact.length.toLocaleString()} bytes).`);
      if (artifactType === "resource_pack")
        project.logs.push(resourcePackFormat(request.version) === undefined
          ? `Kept the pack_format from the generated pack.mcmeta. The server's compatibility table doesn't list Minecraft ${request.version}.`
          : `Set pack metadata for Minecraft ${request.version} from the server's compatibility table.`);
      if (artifactType === "resource_pack") project.logs.push("This packager accepts text assets only; requested textures or other binary assets may still need to be added separately.");
      if (artifactType === "shader_pack") {
        const features = generated.shaderReport!.features;
        project.logs.push(`Shader feature report: ${features.filter(item => item.status === "implemented").length} reported implemented, ${features.filter(item => item.status === "approximation").length} approximated, ${features.filter(item => item.status === "omitted").length} omitted. Effects are not runtime-verified.`);
        for (const feature of features) for (const warning of feature.warnings || []) project.logs.push(`Feature report warning (${feature.name}): ${warning}`);
        if (recognizedShaderLook(generated)) {
          project.logs.push("Reference interpretation and eight allowed look controls validated. Assembled the pinned AuroraHorizon renderer; source paths and immutable rendering contracts checked.");
          project.logs.push("Foundation evidence: candidate02 water view accepted by owner; candidate03 terrain is experimental. Base compiled offline on one driver. This adaptation has not been compiled or visually tested in Iris.");
        }
        project.logs.push("ZIP packaging succeeded. This output's GLSL compiler compatibility and GPU runtime behavior have not been checked.");
      }
      saveArtifact(project, packaged.artifact);
      return project;
    }
    if (!builder) {
      project.status = "preview";
      project.logs.push(artifactType === "mod"
        ? `Mod source preview created. Configure an isolated build service that supports ${isPlatformId(target) ? PLATFORMS[target].label : target} to compile a downloadable mod JAR.`
        : "Source preview created. No isolated build service is configured; compilation has not run and no JAR is available.");
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
        const { kind, label } = isPlatformId(target) ? PLATFORMS[target] : PLATFORMS.paper;
        project.logs.push(
          kind === "mod"
            ? `Build succeeded. Test the mod in a ${label} ${request.version} instance before use.`
            : `Build succeeded. Test behavior on a local ${label} ${kind === "proxy" ? "proxy" : "server"} before use.`,
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
          request.version,
        );
        project.name = generated.name;
        project.files = generated.files;
        project.message = generated.message;
      }
    }
    throw new Error(
      "Compilation failed after three repair attempts. Review the build logs and revise your prompt.",
    );
  } catch (error) {
    if (error instanceof Error && error.name === "BillingError") {
      if (!project.files.length) throw error;
      project.status = "preview";
      project.error = error.message;
      project.logs.push("Automatic repair stopped because the credit balance could not cover another model pass. The generated source remains available.");
      return project;
    }
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
