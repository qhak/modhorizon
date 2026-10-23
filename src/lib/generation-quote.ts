import { BillingError } from "./billing-errors";
import type { PlanId } from "./billing-catalog";
import { estimateCreditsForModel, findModel, reserveCreditsForGeneration } from "./models";
import type { GenerateRequest } from "./types";
import { estimateProviderInputTokens } from "./ai-provider";

type QuoteAccount = { plan: PlanId; subscriptionStatus: string; credits: number };

export function quoteGeneration(account: QuoteAccount, request: GenerateRequest, errors?: string[]) {
  const model = findModel(request.modelId);
  if (!model) throw new BillingError("Choose an available AI model.", 400);
  const paid = account.plan !== "free" && ["active", "trialing"].includes(account.subscriptionStatus);
  if (account.plan !== "free" && !paid)
    throw new BillingError("Your subscription needs attention before you can generate.", 402);
  if (model.provider !== "demo" && model.group !== "Economy" && !paid)
    throw new BillingError("Upgrade to a paid plan to use this model. Economy models are available on Free.", 402);
  // Include repair diagnostics as well as source and instruction overhead in the hold.
  const inputTokens = estimateProviderInputTokens(request, errors);
  const reservedCredits = reserveCreditsForGeneration(model.id, inputTokens, request.reasoningEffort, request.artifactType);
  const estimatedCredits = model.provider === "demo" ? 0 : estimateCreditsForModel(model.id, inputTokens, 5_000, request.reasoningEffort);
  if (reservedCredits === null || estimatedCredits === null)
    throw new BillingError("Credit estimate is unavailable for this model.");
  return {
    modelId: model.id,
    reasoningEffort: request.reasoningEffort,
    estimatedCredits: Math.min(estimatedCredits, reservedCredits),
    reservedCredits,
    balance: account.credits,
    affordable: account.credits >= reservedCredits,
    scope: "one_model_pass" as const,
    repairsIncluded: false,
  };
}
