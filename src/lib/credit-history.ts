import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";
const PAGE_SIZE = 25;
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
};
type HistoryRow = { id: string; delta: number; reason: string; model_id: string | null; created_at: number };
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
  const result = await db.prepare(`SELECT id,delta,reason,model_id,created_at FROM credit_ledger
    WHERE account_id=? AND (created_at<? OR (created_at=? AND id<?))
    ORDER BY created_at DESC,id DESC LIMIT ?`).bind(accountId, before, before, beforeId, PAGE_SIZE + 1).all<HistoryRow>();
  const rows = result.results ?? [], page = rows.slice(0, PAGE_SIZE), last = page.at(-1);
  return {
    entries: page.map(row => ({ id: row.id, credits: row.delta, description: labels[row.reason] ?? "Credit balance adjustment", modelId: row.model_id, createdAt: row.created_at })),
    nextCursor: rows.length > PAGE_SIZE && last ? Buffer.from(JSON.stringify([last.created_at, last.id])).toString("base64url") : null,
  };
}
