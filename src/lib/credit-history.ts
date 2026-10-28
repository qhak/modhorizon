import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";
const PAGE_SIZE = 10;
const labels: Record<string, string> = {
  weekly_free_allowance: "Weekly allowance reset",
  subscription_credit_grant: "Subscription allowance reset",
  manual_credit_pack: "Extra credits purchased",
  generation_reserve: "Credits reserved for generation",
  generation_settlement: "Unused reserved credits returned",
  generation_refund: "Generation credits refunded",
  subscription_cancel_allowance: "Free allowance after subscription ended",
  complimentary_starter_access: "Complimentary Starter allowance",
  complimentary_plan_downgrade: "Free allowance after downgrade",
  rewarded_ad_grant: "Rewarded ad credit",
  rewarded_ad_expiry: "Expired rewarded ad credit",
  social_reward_grant: "Social follow reward",
  social_reward_expiry: "Expired social reward credit",
};
type HistoryRow = { id: string; delta: number; reason: string; model_id: string | null; created_at: number;
  generation_id: string | null; call_kind: "generation" | "repair" | null; input_tokens: number | null; output_tokens: number | null;
  usage_source: "reported" | "estimated" | null; charged_credits: number | null; provider_request_id: string | null;
  reservation_state: "held" | "settled" | "refunded" | null; reserved_credits: number | null };
export async function creditHistory(db: D1Database, accountId: string, cursor: string | null) {
  let before = Number.MAX_SAFE_INTEGER, beforeId = "~";
  if (cursor) {
    try {
      if (cursor.length > 250) throw new Error();
      const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (!Array.isArray(value) || value.length !== 2 || !Number.isSafeInteger(value[0]) || value[0] < 0 || typeof value[1] !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value[1])) throw new Error();
      [before, beforeId] = value;
    } catch { throw new BillingError("Invalid credit history cursor.", 400); }
  }
  const result = await db.prepare(`WITH grouped AS (
      SELECT CASE WHEN reservation_id IS NULL THEN 'l_' || id ELSE 'r_' || reservation_id END AS id,
        reservation_id, SUM(delta) AS delta, MAX(created_at) AS created_at,
        MAX(model_id) AS model_id, MAX(reason) AS reason
      FROM credit_ledger WHERE account_id=?
      GROUP BY CASE WHEN reservation_id IS NULL THEN 'l_' || id ELSE 'r_' || reservation_id END
    )
    SELECT g.id,g.delta,g.reason,g.model_id,g.created_at,r.generation_id,r.call_kind,r.input_tokens,r.output_tokens,r.usage_source,r.charged_credits,r.provider_request_id,r.state AS reservation_state,r.reserved_credits
    FROM grouped g LEFT JOIN generation_credit_reservations r ON r.id=g.reservation_id AND r.account_id=?
    WHERE (g.created_at<? OR (g.created_at=? AND g.id<?))
    ORDER BY g.created_at DESC,g.id DESC LIMIT ?`).bind(accountId, accountId, before, before, beforeId, PAGE_SIZE + 1).all<HistoryRow>();
  const rows = result.results ?? [], page = rows.slice(0, PAGE_SIZE), last = page.at(-1);
  return {
    entries: page.map(row => ({ id: row.id, credits: row.delta,
      description: row.reservation_state === "held" ? "Generation in progress" : row.reservation_state === "refunded" ? "Generation refunded" : row.reservation_state === "settled" ? (row.call_kind === "repair" ? "Generation repair" : "Generation completed") : labels[row.reason] ?? "Credit balance adjustment",
      modelId: row.model_id, createdAt: row.created_at,
      reservation: row.reservation_state ? { state: row.reservation_state, reservedCredits: row.reserved_credits, chargedCredits: row.charged_credits } : null,
      usage: row.usage_source && row.input_tokens !== null && row.output_tokens !== null ? {
        generationId: row.generation_id, callKind: row.call_kind, inputTokens: row.input_tokens, outputTokens: row.output_tokens,
        source: row.usage_source, chargedCredits: row.charged_credits, providerRequestId: row.provider_request_id,
      } : null })),
    nextCursor: rows.length > PAGE_SIZE && last ? Buffer.from(JSON.stringify([last.created_at, last.id])).toString("base64url") : null,
  };
}
