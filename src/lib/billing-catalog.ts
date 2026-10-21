export const BILLING_PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    interval: "week",
    credits: 10,
    extraCreditMilliUsd: null,
    description: "Try the workspace with a small weekly allowance.",
    features: ["10 credits each week", "Economy models", "Community support"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 1499,
    interval: "month",
    credits: 350,
    extraCreditMilliUsd: 70,
    description: "For building and iterating on personal projects.",
    features: ["350 credits each month", "Every model", "Project history"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 4999,
    interval: "month",
    credits: 1500,
    extraCreditMilliUsd: 40,
    description: "More room for regular creation and larger ideas.",
    features: ["1,500 credits each month", "Every model", "Priority generation", "Advanced projects"],
  },
  studio: {
    id: "studio",
    name: "Studio",
    priceCents: 9999,
    interval: "month",
    credits: 4000,
    extraCreditMilliUsd: 25,
    description: "A larger monthly allowance for power users.",
    features: ["4,000 credits each month", "Every model", "Multiple projects", "Concurrent builds"],
  },
} as const;

export type PlanId = keyof typeof BILLING_PLANS;
export type PaidPlanId = Exclude<PlanId, "free">;
export const PAID_PLAN_IDS: readonly PaidPlanId[] = ["starter", "pro", "studio"];
export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && Object.hasOwn(BILLING_PLANS, value);
}
export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return value === "starter" || value === "pro" || value === "studio";
}
export function isActivePlan(plan: PlanId, status: string) {
  return plan === "free" || status === "active" || status === "trialing";
}

