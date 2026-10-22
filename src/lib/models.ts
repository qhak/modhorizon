export type ModelProvider = "openai" | "anthropic" | "google" | "demo";
export type ModelGroup = "Economy" | "Balanced" | "Advanced" | "Frontier";
import type { ReasoningLevel } from "./types";
import { testingModelAllowed } from "./model-access";
export type { ReasoningLevel } from "./types";
export const REASONING_EFFORTS: readonly ReasoningLevel[] = ["minimal", "low", "medium", "high", "xhigh", "max"];
export const DEFAULT_REASONING_EFFORT: ReasoningLevel = "medium";
export function providerReasoningEffort(effort: ReasoningLevel, _provider: ModelProvider): ReasoningLevel { return effort; }
export function reasoningEstimateMultiplier(effort: ReasoningLevel) {
  return effort === "minimal" ? 0.6 : effort === "low" ? 0.75 : effort === "medium" ? 1 : effort === "high" ? 1.5 : effort === "xhigh" ? 2 : 2.5;
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
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview",
    provider: "google",
    providerLabel: "Google Gemini",
    group: "Economy",
    description: "Free-tier testing project · limited quota",
    inputUsdPerMillion: 0.5,
    outputUsdPerMillion: 3,
  },
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
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0)
    throw new Error("Token usage must contain nonnegative safe integers.");
  const model = findModel(modelId);
  if (!model || model.provider === "demo") return 0;
  if (model.inputUsdPerMillion === undefined || model.outputUsdPerMillion === undefined) return null;
  // USD per million tokens numerically equals micro-USD per token.
  const providerCostMicroUsd = Math.ceil(inputTokens * model.inputUsdPerMillion + outputTokens * model.outputUsdPerMillion);
  return Math.max(1, Math.ceil(providerCostMicroUsd / PROVIDER_COST_BUDGET_MICRO_USD_PER_CREDIT));
}

export function reserveCreditsForGeneration(modelId: string, estimatedInputTokens: number, effort: ReasoningLevel = DEFAULT_REASONING_EFFORT) {
  const base = creditsForUsage(modelId, estimatedInputTokens, MAX_GENERATION_OUTPUT_TOKENS);
  // Low effort is an estimate, not a provider output limit. Never discount the hold
  // below the configured output ceiling; settlement refunds unused credits.
  return base === null ? null : Math.ceil(base * Math.max(1, reasoningEstimateMultiplier(effort)));
}

export function estimateCreditsForModel(modelId: string, inputTokens = 1_500, outputTokens = 5_000, effort: ReasoningLevel = DEFAULT_REASONING_EFFORT) {
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
  const demoReady = development && !openAIReady && !anthropicReady && !googleReady && !env.GEMINI_FREE_API_KEY;

  return Object.fromEntries(
    MODEL_OPTIONS.map((model) => [
      model.id,
      testingModelAllowed(model.id, env) && (model.id === "gemini-3-flash-preview"
        ? Boolean(env.GEMINI_FREE_API_KEY)
        : model.provider === "openai"
        ? openAIReady
        : model.provider === "anthropic"
          ? anthropicReady
          : model.provider === "google"
            ? googleReady
          : demoReady),
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

export const REASONING_LABELS: Record<ReasoningLevel, string> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Max",
};

// The effort levels each provider's API accepts, lowest first.
const PROVIDER_REASONING: Record<Exclude<ModelProvider, "demo">, ReasoningLevel[]> = {
  openai: ["low", "medium", "high", "xhigh"],
  anthropic: ["low", "medium", "high", "xhigh", "max"],
  google: ["minimal", "low", "medium", "high"],
};

// Each provider's own default; Claude Opus 5.5 defaults lower than other Claude models.
const PROVIDER_DEFAULT: Record<Exclude<ModelProvider, "demo">, ReasoningLevel> = {
  openai: "medium",
  anthropic: "high",
  google: "high",
};
const MODEL_DEFAULT: Record<string, ReasoningLevel> = { "claude-opus-5-5": "medium" };

/** Reasoning levels a model offers, or null for the local preview, which makes no AI call. */
export function reasoningFor(modelId: string): { levels: ReasoningLevel[]; default: ReasoningLevel } | null {
  const model = findModel(modelId);
  if (!model || model.provider === "demo") return null;
  return {
    levels: PROVIDER_REASONING[model.provider],
    default: MODEL_DEFAULT[model.id] ?? PROVIDER_DEFAULT[model.provider],
  };
}
