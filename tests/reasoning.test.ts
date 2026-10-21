import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateCreditsForModel, providerReasoningEffort } from "../src/lib/models";
import { validateRequest } from "../src/lib/validation";

test("reasoning effort is validated and defaults to Standard", () => {
  const base = { prompt: "A plugin that raises lava every fifteen seconds.", platform: "paper", version: "1.21.4" };
  assert.equal(validateRequest(base).reasoningEffort, "standard");
  assert.equal(validateRequest({ ...base, reasoningEffort: "ultra" }).reasoningEffort, "ultra");
  assert.throws(() => validateRequest({ ...base, reasoningEffort: "unlimited" }));
});

test("reasoning maps to provider controls and scales the displayed credit estimate", () => {
  assert.equal(providerReasoningEffort("ultra", "openai"), "xhigh");
  assert.equal(providerReasoningEffort("ultra", "anthropic"), "xhigh");
  assert.equal(providerReasoningEffort("ultra", "google"), "high");
  const light = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "light")!;
  const standard = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "standard")!;
  const high = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "high")!;
  const ultra = estimateCreditsForModel("gpt-6.1-sol", 1_500, 5_000, "ultra")!;
  assert.ok(light < standard);
  assert.ok(standard < high);
  assert.ok(high < ultra);
});
