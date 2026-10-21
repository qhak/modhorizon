import {
  MINECRAFT_VERSIONS,
  type GenerateRequest,
  type GeneratedProject,
} from "./types";
import { DEFAULT_MODEL_ID, findModel } from "./models";

export const MAX_REQUEST_BYTES = 200_000;
export class InputError extends Error {}

export function validateProject(value: unknown): GeneratedProject {
  if (!value || typeof value !== "object")
    throw new InputError("The provider did not return a project object.");
  const project = value as Record<string, unknown>;
  if (
    typeof project.name !== "string" ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(project.name)
  ) {
    throw new InputError(
      "Project names must use 1–48 letters, numbers, underscores, or hyphens and start with a letter.",
    );
  }
  if (
    !Array.isArray(project.files) ||
    project.files.length === 0 ||
    project.files.length > 30
  )
    throw new InputError("A project must contain 1–30 source files.");
  const seen = new Set<string>();
  let bytes = 0;
  const files = project.files.map((file: unknown) => {
    if (!file || typeof file !== "object")
      throw new InputError("Invalid source file.");
    const { path, content } = file as Record<string, unknown>;
    if (
      typeof path !== "string" ||
      path.length > 200 ||
      path.includes("..") ||
      !/^(src\/main\/java\/(?:[A-Za-z_][A-Za-z0-9_]*\/)*[A-Za-z_][A-Za-z0-9_]*\.java|src\/main\/resources\/(plugin|config)\.yml)$/.test(
        path,
      )
    ) {
      throw new InputError(
        "Only Java source files and plugin.yml/config.yml are accepted; build scripts and unsafe paths are blocked.",
      );
    }
    if (seen.has(path.toLowerCase()))
      throw new InputError("Duplicate source file path.");
    seen.add(path.toLowerCase());
    if (
      typeof content !== "string" ||
      content.includes("\0") ||
      content.length > 40_000
    )
      throw new InputError(
        "Source files must be text and no larger than 40,000 characters.",
      );
    bytes += new TextEncoder().encode(content).length;
    if (bytes > 150_000)
      throw new InputError(
        "Generated project exceeds the 150 KB source limit.",
      );
    return { path, content };
  });
  if (
    !seen.has("src/main/resources/plugin.yml") ||
    !files.some((file) => file.path.endsWith(".java"))
  )
    throw new InputError(
      "A Paper plugin needs Java source and src/main/resources/plugin.yml.",
    );
  const descriptor = files.find(
    (file) => file.path === "src/main/resources/plugin.yml",
  )!.content;
  const metadata = (key: string) => {
    const match = descriptor.match(new RegExp(`^${key}:\\s*[\"']?([^\\r\\n\"']+)[\"']?\\s*$`, "m"));
    return match?.[1]?.trim();
  };
  const mainClass = metadata("main");
  const apiVersion = metadata("api-version");
  if (!metadata("name") || !mainClass || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(mainClass))
    throw new InputError("plugin.yml needs a valid name and fully qualified main class.");
  if (!apiVersion || !/^\d+\.\d+(?:\.\d+)?$/.test(apiVersion))
    throw new InputError("plugin.yml needs a valid api-version such as 1.21.");
  const mainPath = `src/main/java/${mainClass.replace(/\./g, "/")}.java`;
  const mainFile = files.find((file) => file.path === mainPath);
  if (!mainFile)
    throw new InputError("plugin.yml main must point to an included Java source file.");
  const packageName = mainClass.split(".").slice(0, -1).join(".");
  if (!new RegExp(`^\\s*package\\s+${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*;`, "m").test(mainFile.content))
    throw new InputError("The Java package must match plugin.yml main.");
  return { name: project.name, files };
}

export function validateRequest(value: unknown): GenerateRequest {
  if (!value || typeof value !== "object")
    throw new InputError("Expected a JSON object.");
  const data = value as Record<string, unknown>;
  if (
    typeof data.prompt !== "string" ||
    data.prompt.trim().length < 12 ||
    data.prompt.length > 4000
  )
    throw new InputError("Describe your plugin in 12–4,000 characters.");
  if (!MINECRAFT_VERSIONS.includes(data.version as GenerateRequest["version"]))
    throw new InputError("Choose a supported Minecraft 1.21.x version.");
  const modelId = data.modelId ?? DEFAULT_MODEL_ID;
  if (typeof modelId !== "string" || !findModel(modelId))
    throw new InputError("Choose a supported AI model.");
  return {
    prompt: data.prompt.trim(),
    version: data.version as GenerateRequest["version"],
    modelId,
    ...(data.project === undefined
      ? {}
      : { project: validateProject(data.project) }),
  };
}
