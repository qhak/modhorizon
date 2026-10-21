import assert from "node:assert/strict";
import { test } from "node:test";
import { creditsForUsage, estimateCreditsForModel, providerReasoningEffort, reserveCreditsForGeneration } from "../src/lib/models";
import { validateRequest } from "../src/lib/validation";
import { quoteGeneration } from "../src/lib/generation-quote";
import { normalizedUsage } from "../src/lib/ai-provider";

test("reasoning effort is validated and defaults to Medium", () => {
  const base = { prompt: "A plugin that raises lava every fifteen seconds.", platform: "paper", version: "1.21.4" };
  assert.equal(validateRequest(base).reasoningEffort, "medium");
  assert.equal(validateRequest({ ...base, reasoningEffort: "xhigh" }).reasoningEffort, "xhigh");
  assert.throws(() => validateRequest({ ...base, reasoningEffort: "max" }), /not supported/);
  assert.throws(() => validateRequest({ ...base, reasoningEffort: "unlimited" }));
});

test("server validates provider-specific reasoning and rejects mismatched artifact types", () => {
  const base = { prompt: "Make a floor is lava plugin that rises every fifteen seconds.", platform: "paper", version: "1.21.4" };
  assert.equal(validateRequest({ ...base, modelId: "gemini-4-argon" }).reasoningEffort, "high");
  assert.equal(validateRequest({ ...base, modelId: "claude-opus-5-5" }).reasoningEffort, "medium");
  assert.throws(() => validateRequest({ ...base, modelId: "gemini-4-argon", reasoningEffort: "xhigh" }), /not supported/);
  for (const artifactType of ["mod", "shader_pack", "resource_pack", "datapack"])
    assert.throws(() => validateRequest({ ...base, artifactType }), /matching platform/);
  assert.equal(validateRequest({ ...base, artifactType: "plugin" }).artifactType, "plugin");
});

test("quotes enforce paid access and describe a single pass without spending credits", () => {
  const input = validateRequest({ prompt: "Make lava rise every fifteen seconds.", platform: "paper", version: "1.21.4", modelId: "gpt-6.1-sol" });
  const free = { plan: "free" as const, subscriptionStatus: "inactive", credits: 1000 };
  assert.throws(() => quoteGeneration(free, input), /paid plan/);
  const paid = { plan: "starter" as const, subscriptionStatus: "active", credits: 1000 };
  const quote = quoteGeneration(paid, input);
  assert.equal(quote.affordable, true);
  assert.equal(quote.scope, "one_model_pass");
  assert.equal(quote.repairsIncluded, false);
  assert.ok(quote.estimatedCredits <= quote.reservedCredits);
  assert.equal(paid.credits, 1000);
  assert.equal(quoteGeneration({ ...paid, credits: 0 }, input).affordable, false);
  assert.throws(() => quoteGeneration({ ...paid, subscriptionStatus: "past_due" }, input), /attention/);
  assert.equal(quoteGeneration(free, { ...input, modelId: "demo" }).reservedCredits, 0);
});

test("low reasoning cannot reserve below the output ceiling and invalid usage cannot create credits", () => {
  const ceiling = creditsForUsage("gpt-6.1-sol", 3000, 16_000)!;
  assert.ok(reserveCreditsForGeneration("gpt-6.1-sol", 3000, "low")! >= ceiling);
  for (const tokens of [-1, 0.1, NaN, Infinity])
    assert.throws(() => creditsForUsage("gpt-6.1-sol", tokens, 20));
});

test("usage includes Gemini thought tokens without counting OpenAI reasoning twice", () => {
  assert.deepEqual(normalizedUsage({ total_input_tokens: 100, total_output_tokens: 200, total_thought_tokens: 300 }), { inputTokens: 100, outputTokens: 500 });
  assert.deepEqual(normalizedUsage({ input_tokens: 100, output_tokens: 500, output_tokens_details: { reasoning_tokens: 300 } }), { inputTokens: 100, outputTokens: 500 });
  assert.equal(normalizedUsage({ input_tokens: 100 }), undefined);
  assert.equal(normalizedUsage({ input_tokens: -100, output_tokens: 500 }), undefined);
});

test("reasoning maps to provider controls and scales the displayed credit estimate", () => {
  assert.equal(providerReasoningEffort("xhigh", "openai"), "xhigh");
  assert.equal(providerReasoningEffort("max", "anthropic"), "max");
  assert.equal(providerReasoningEffort("high", "google"), "high");
  const low = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "low")!;
  const medium = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "medium")!;
  const high = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "high")!;
  const max = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "max")!;
  assert.ok(low < medium);
  assert.ok(medium < high);
  assert.ok(high < max);
});
