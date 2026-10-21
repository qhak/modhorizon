export type ModelProvider = "openai" | "anthropic" | "google" | "demo";
export type ModelGroup = "Economy" | "Balanced" | "Advanced" | "Frontier";
export type ReasoningEffort = "light" | "standard" | "high" | "ultra";
export const REASONING_EFFORTS: readonly ReasoningEffort[] = ["light", "standard", "high", "ultra"];
export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "standard";
export function providerReasoningEffort(effort: ReasoningEffort, provider: ModelProvider) {
  if (provider === "google") return effort === "light" ? "low" : effort === "standard" ? "medium" : "high";
  return effort === "light" ? "low" : effort === "standard" ? "medium" : effort === "high" ? "high" : "xhigh";
}
export function reasoningEstimateMultiplier(effort: ReasoningEffort) {
  return effort === "light" ? 0.75 : effort === "standard" ? 1 : effort === "high" ? 1.5 : 2.25;
}

export type ModelOption = {
  id: string;
  label: string;
  provider: ModelProvider;
  providerLabel: string;
  group: ModelGroup;
  description: string;
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gpt-6-luna",
    label: "GPT-6 Luna",
    provider: "openai",
    providerLabel: "OpenAI",
    group: "Economy",
    description: "Fast and cost-efficient",
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.5,
  },
  {
    id: "gpt-6.1-sol",
    label: "GPT-6.1 Sol",
    provider: "openai",
    providerLabel: "OpenAI",
    group: "Balanced",
    description: "Strong everyday coding",
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 10,
  },
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    provider: "anthropic",
    providerLabel: "Anthropic",
    group: "Balanced",
    description: "Fast with strong reasoning",
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 10,
  },
  {
    id: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    provider: "anthropic",
    providerLabel: "Anthropic",
    group: "Advanced",
    description: "For complex plugin ideas",
    inputUsdPerMillion: 4,
    outputUsdPerMillion: 20,
  },
  {
    id: "gpt-6-astra",
    label: "GPT-6 Astra",
    provider: "openai",
    providerLabel: "OpenAI",
    group: "Frontier",
    description: "Highest capability, premium usage",
    inputUsdPerMillion: 10,
    outputUsdPerMillion: 50,
  },
  {
    id: "claude-fable-5-1",
    label: "Claude Fable 5.1",
    provider: "anthropic",
    providerLabel: "Anthropic",
    group: "Frontier",
    description: "Long-horizon coding and reasoning",
    inputUsdPerMillion: 10,
    outputUsdPerMillion: 50,
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon",
    provider: "google",
    providerLabel: "Google Gemini",
    group: "Frontier",
    description: "Flagship reasoning · intro rate through Nov 30",
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 10,
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    provider: "google",
    providerLabel: "Google Gemini",
    group: "Balanced",
    description: "Long-horizon coding · intro rate through Dec 31",
    inputUsdPerMillion: 0.75,
    outputUsdPerMillion: 3.75,
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    provider: "google",
    providerLabel: "Google Gemini",
    group: "Economy",
    description: "Legacy alias · Google routes to 3.8 Flash",
    inputUsdPerMillion: 0.75,
    outputUsdPerMillion: 3.75,
  },
  {
    id: "demo",
    label: "Local example preview",
    provider: "demo",
    providerLabel: "Development only",
    group: "Economy",
    description: "Fixed zombie-speed example; no AI call",
  },
];

export const DEFAULT_MODEL_ID = "gpt-6-luna";

export function findModel(id: string | undefined) {
  return MODEL_OPTIONS.find((model) => model.id === id);
}

// Credits are priced against the most generous top-up rate: Studio's $0.025
// per credit. At $0.005 of provider cost per credit, the target gross margin
// is 80% before Stripe fees, hosting, taxes, and support.
export const PROVIDER_COST_BUDGET_MICRO_USD_PER_CREDIT = 5_000;
export const MAX_GENERATION_OUTPUT_TOKENS = 16_000;

export function creditsForUsage(modelId: string, inputTokens: number, outputTokens: number) {
  const model = findModel(modelId);
  if (!model || model.provider === "demo") return 0;
  if (model.inputUsdPerMillion === undefined || model.outputUsdPerMillion === undefined) return null;
  // USD per million tokens numerically equals micro-USD per token.
  const providerCostMicroUsd = Math.ceil(inputTokens * model.inputUsdPerMillion + outputTokens * model.outputUsdPerMillion);
  return Math.max(1, Math.ceil(providerCostMicroUsd / PROVIDER_COST_BUDGET_MICRO_USD_PER_CREDIT));
}

export function reserveCreditsForGeneration(modelId: string, estimatedInputTokens: number, effort: ReasoningEffort = DEFAULT_REASONING_EFFORT) {
  const base = creditsForUsage(modelId, estimatedInputTokens, MAX_GENERATION_OUTPUT_TOKENS);
  return base === null ? null : Math.ceil(base * reasoningEstimateMultiplier(effort));
}

export function estimateCreditsForModel(modelId: string, inputTokens = 1_500, outputTokens = 5_000, effort: ReasoningEffort = DEFAULT_REASONING_EFFORT) {
  const base = creditsForUsage(modelId, inputTokens, outputTokens);
  return base === null ? null : Math.max(1, Math.ceil(base * reasoningEstimateMultiplier(effort)));
}

export function modelChoices(env: NodeJS.ProcessEnv) {
  const openAIReady = Boolean(
    env.OPENAI_API_KEY || (env.AI_API_KEY && env.AI_MODEL),
  );
  const anthropicReady = Boolean(env.ANTHROPIC_API_KEY);
  const googleReady = Boolean(env.GEMINI_API_KEY);
  const development = env.NODE_ENV !== "production";
  const demoReady = development && !openAIReady && !anthropicReady && !googleReady;

  return Object.fromEntries(
    MODEL_OPTIONS.map((model) => [
      model.id,
      model.provider === "openai"
        ? openAIReady
        : model.provider === "anthropic"
          ? anthropicReady
          : model.provider === "google"
            ? googleReady
          : demoReady,
    ]),
  ) as Record<string, boolean>;
}

export function preferredModelId(
  choices: Record<string, boolean>,
  env: NodeJS.ProcessEnv,
) {
  const configuredModel = env.AI_MODEL;
  if (configuredModel && choices[configuredModel]) return configuredModel;
  const connectedModel = MODEL_OPTIONS.find(
    (model) => model.provider !== "demo" && choices[model.id],
  );
  if (connectedModel) return connectedModel.id;
  if (choices.demo) return "demo";
  return DEFAULT_MODEL_ID;
}
