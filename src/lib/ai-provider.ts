import { MockProvider } from "./mock-provider";
import { findModel, modelChoices } from "./models";
import { validateProject } from "./validation";
import { selectGenerationSkills } from "./generation-skills";
import { artifactSystemPrompt, selectArtifactSkills } from "./artifact-experts";
import type { AIProvider, GenerateRequest, GeneratedProject } from "./types";

export function trustedEndpoint(value: string, name: string): URL {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  ) {
    throw new Error(
      `${name} must be a trusted HTTPS URL (HTTP loopback is allowed in development).`,
    );
  }
  return url;
}

export async function limitedJson(
  response: Response,
  maxBytes: number,
  timeoutMs = 15_000,
): Promise<unknown> {
  if (!response.body) throw new Error("Service returned an empty response.");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, timeoutMs);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new Error("JSON response body timed out.");
      if (done) break;
      size += value.length;
      if (size > maxBytes)
        throw new Error("Service response exceeds the size limit.");
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

const PROJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  required: ["name", "files"],
};

function projectInput(request: GenerateRequest, errors?: string[]) {
  const artifactType = request.artifactType || "plugin";
  const skills = artifactType === "plugin" ? selectGenerationSkills(request.prompt) : [];
  return JSON.stringify({
    artifactType,
    target: request.target || "paper",
    minecraftVersion: request.version,
    prompt: request.prompt,
    matchedSkills: skills.map(({ label, guidance }) => ({ label, guidance })),
    specialistSkills: selectArtifactSkills(request),
    currentProject: request.project,
    compilationErrors: errors,
  });
}

function parseGeneratedProject(content: string | undefined, request: GenerateRequest): GeneratedProject {
  if (!content)
    throw new Error("AI provider returned no project. Try a more specific request.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI provider returned invalid project JSON.");
  }
  return validateProject(parsed, request.artifactType || "plugin", request.target || "paper");
}

class OpenAIProvider implements AIProvider {
  name = "OpenAI";

  constructor(private readonly modelId: string) {}

  async generate(
    request: GenerateRequest,
    errors?: string[],
  ): Promise<GeneratedProject> {
    const key = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (!key) throw new Error("Configure OPENAI_API_KEY to enable this model.");
    const legacyCompatible = !process.env.OPENAI_API_KEY && Boolean(process.env.AI_API_KEY && process.env.AI_MODEL);
    const endpoint = trustedEndpoint(
      legacyCompatible
        ? process.env.AI_BASE_URL || "https://api.openai.com/v1/"
        : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/",
      legacyCompatible ? "AI_BASE_URL" : "OPENAI_BASE_URL",
    );
    if (!endpoint.pathname.endsWith("/")) endpoint.pathname += "/";
    const response = await fetch(
      new URL(legacyCompatible ? "chat/completions" : "responses", endpoint),
      {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(90_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(
        legacyCompatible
          ? {
              model: this.modelId,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: artifactSystemPrompt(request) },
                { role: "user", content: projectInput(request, errors) },
              ],
            }
          : {
              model: this.modelId,
              max_output_tokens: 16_000,
              input: [
                { role: "system", content: artifactSystemPrompt(request) },
                { role: "user", content: projectInput(request, errors) },
              ],
              text: {
                format: {
                  type: "json_schema",
                  name: `minecraft_${request.artifactType || "plugin"}_project`,
                  strict: true,
                  schema: PROJECT_SCHEMA,
                },
              },
            },
      ),
      },
    );
    if (!response.ok)
      throw new Error(
        `OpenAI request failed (HTTP ${response.status}). Check provider access and configuration.`,
      );
    const data = (await limitedJson(response, 250_000)) as {
      output_text?: string;
      output?: { type?: string; content?: { type?: string; text?: string }[] }[];
      choices?: { message?: { content?: string } }[];
    };
    const content = legacyCompatible
      ? data.choices?.[0]?.message?.content
      : data.output_text || data.output
          ?.flatMap((item) => item.content || [])
          .find((part) => part.type === "output_text")?.text;
    return parseGeneratedProject(content, request);
  }
}

class AnthropicProvider implements AIProvider {
  name = "Anthropic";

  constructor(private readonly modelId: string) {}

  async generate(
    request: GenerateRequest,
    errors?: string[],
  ): Promise<GeneratedProject> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Configure ANTHROPIC_API_KEY to enable this model.");
    const endpoint = trustedEndpoint(
      process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1/",
      "ANTHROPIC_BASE_URL",
    );
    if (!endpoint.pathname.endsWith("/")) endpoint.pathname += "/";
    const response = await fetch(new URL("messages", endpoint), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(90_000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 16_000,
        system: artifactSystemPrompt(request),
        messages: [{ role: "user", content: projectInput(request, errors) }],
      }),
    });
    if (!response.ok)
      throw new Error(
        `Anthropic request failed (HTTP ${response.status}). Check provider access and configuration.`,
      );
    const data = (await limitedJson(response, 250_000)) as {
      content?: { type?: string; text?: string }[];
    };
    const content = data.content
      ?.filter((part) => part.type === "text")
      .map((part) => part.text || "")
      .join("\n");
    return parseGeneratedProject(content, request);
  }
}

class GeminiProvider implements AIProvider {
  name = "Google Gemini";

  constructor(private readonly modelId: string) {}

  async generate(
    request: GenerateRequest,
    errors?: string[],
  ): Promise<GeneratedProject> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Configure GEMINI_API_KEY to enable this model.");
    const endpoint = trustedEndpoint(
      process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/",
      "GEMINI_BASE_URL",
    );
    if (!endpoint.pathname.endsWith("/")) endpoint.pathname += "/";
    const response = await fetch(new URL("interactions", endpoint), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(180_000),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        model: this.modelId,
        system_instruction: artifactSystemPrompt(request),
        input: projectInput(request, errors),
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: PROJECT_SCHEMA,
        },
      }),
    });
    if (!response.ok)
      throw new Error(
        `Google Gemini request failed (HTTP ${response.status}). Check Google AI API access and configuration.`,
      );
    const data = (await limitedJson(response, 250_000)) as {
      status?: string;
      steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
    };
    if (data.status && data.status !== "completed")
      throw new Error(`Google Gemini generation ended with status: ${data.status}.`);
    const content = data.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content || [])
      .filter((part) => part.type === "text")
      .map((part) => part.text || "")
      .join("\n");
    return parseGeneratedProject(content, request);
  }
}

export function createAIProvider(modelId?: string): AIProvider {
  if (!modelId && process.env.NODE_ENV === "production" && process.env.AI_PROVIDER === "mock")
    throw new Error("Mock generation is disabled in production.");
  const selectedId = modelId || (process.env.NODE_ENV !== "production" && process.env.AI_PROVIDER === "mock" ? "demo" : process.env.AI_MODEL || "gpt-6-luna");
  const model = findModel(selectedId);
  if (!model) throw new Error("Choose a supported AI model.");
  if (selectedId === "demo" && process.env.NODE_ENV === "production")
    throw new Error("Mock generation is disabled in production.");
  if (!modelChoices(process.env)[selectedId])
    throw new Error("This model is not connected. Check provider settings.");
  if (model.provider === "demo") {
    return new MockProvider();
  }
  if (model.provider === "openai") return new OpenAIProvider(model.id);
  if (model.provider === "anthropic") return new AnthropicProvider(model.id);
  return new GeminiProvider(model.id);
}
