import { limitedJson } from "./ai-provider";
import { serviceFetch } from "./service-fetch";
import type { GeneratedProject } from "./types";

export type ShaderCompileResult = { success: boolean; logs: string[] };
export interface ShaderCompiler { check(project: GeneratedProject): Promise<ShaderCompileResult> }

/** Experimental raw-driver checker, deliberately restricted to local development. */
export function shaderCompilerConfigured(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "development" && Boolean(env.SHADER_COMPILER_TOKEN && env.SHADER_COMPILER_URL === "http://127.0.0.1:3231/check");
}

export function createShaderCompiler(): ShaderCompiler | undefined {
  if (!shaderCompilerConfigured()) return undefined;
  return { async check(project) {
    const response = await serviceFetch("http://127.0.0.1:3231/check", {
      method: "POST", signal: AbortSignal.timeout(45_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SHADER_COMPILER_TOKEN}` },
      body: JSON.stringify({ name: project.name, files: project.files }),
    });
    if (!response.ok) throw new Error(`Local shader compiler unavailable (HTTP ${response.status}). Source and earlier diagnostics retained.`);
    const result = await limitedJson(response, 100_000) as Record<string, unknown>;
    if (typeof result.success !== "boolean" || !Array.isArray(result.logs) || !result.logs.length || result.logs.length > 200 || !result.logs.every(line => typeof line === "string" && line.length <= 2000))
      throw new Error("Local shader compiler returned an invalid result.");
    return { success: result.success, logs: result.logs as string[] };
  } };
}
