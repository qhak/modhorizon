"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RewardedAds } from "./rewarded-ads";

type Entry = { id: string; credits: number; description: string; modelId: string | null; createdAt: number;
  usage: { generationId: string | null; callKind: "generation" | "repair" | null; inputTokens: number; outputTokens: number; source: "reported" | "estimated"; chargedCredits: number | null; providerRequestId: string | null } | null };
type Summary = { plan: string; planName: string; balance: number; allowanceCredits: number; purchasedCredits: number;
  rewardedAdCredits: number; socialRewardCredits: number;
  subscriptionStatus: string; complimentary: boolean; hasBillingCustomer: boolean; periodEnd: number | null;
  cancelAtPeriodEnd: boolean; renewalUnavailable: boolean; priceCents: number };
const date = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function BillingDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load(next?: string) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/billing/history${next ? `?cursor=${encodeURIComponent(next)}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load billing details.");
      setSummary(data.summary); setCursor(data.nextCursor);
      setEntries(previous => next ? [...previous, ...data.entries] : data.entries);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load billing details."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  return <section className="billing-dashboard" aria-labelledby="billing-heading">
    <div className="billing-section-heading"><h2 id="billing-heading">Plan & credits</h2><button className="account-text" disabled={busy} onClick={() => void load()}>{busy ? "Loading…" : "Refresh"}</button></div>
    {error && <p className="account-notice" role="alert">{error}</p>}
    {!summary && !error && <p className="account-intro">Loading your balance…</p>}
    {summary && <>
      <div className="billing-plan"><strong>{summary.planName}</strong><span>{summary.complimentary ? "Complimentary access" : summary.plan === "free" ? "Free account" : `${money(summary.priceCents)} / month`}</span></div>
      <div className="billing-balances"><div><strong>{summary.balance.toLocaleString()}</strong><span>Total credits</span></div><div><strong>{summary.allowanceCredits.toLocaleString()}</strong><span>{summary.plan === "free" ? "Weekly" : "Monthly"} remaining</span></div><div><strong>{summary.rewardedAdCredits.toLocaleString()}</strong><span>Ad credits · expire after 7 days</span></div><div><strong>{summary.socialRewardCredits.toLocaleString()}</strong><span>Social rewards · expire after 7 days</span></div><div><strong>{summary.purchasedCredits.toLocaleString()}</strong><span>Purchased · carry over</span></div></div>
      <p className="account-intro">{summary.plan === "free" ? "Your free allowance resets each Monday (UTC)." : summary.complimentary ? "No recurring subscription charge is scheduled for your complimentary access." : summary.renewalUnavailable ? "The renewal date could not be verified. Check Manage subscription for the latest details." : summary.cancelAtPeriodEnd ? `Renewal canceled. You switch to Free ${summary.periodEnd ? `on ${date(summary.periodEnd * 1000)}` : "at the end of this billing period"}.` : summary.periodEnd ? `Next renewal: ${date(summary.periodEnd * 1000)} · ${money(summary.priceCents)} before any tax or discounts.` : "Your renewal date is being confirmed."}</p>
      {summary.plan === "free" && <RewardedAds onReward={() => void load()} />}
      {summary.plan !== "free" && !["active", "trialing"].includes(summary.subscriptionStatus) && <p className="account-notice">Your subscription needs attention. Open Manage subscription to check your billing details.</p>}
      <Link className="account-secondary" href="/pricing">{summary.plan === "free" ? "Explore plans" : "Buy extra credits or change plan"}</Link>
      <div className="billing-section-heading"><h2>Credit history</h2></div>
      <p className="account-fine">Reservations hold credits before generation. Unused credits are returned afterward. Allowance resets replace the unused allowance.</p>
      {entries.length === 0 ? <p className="account-intro">No credit activity yet.</p> : <ul className="credit-history" aria-label="Credit transactions">{entries.map(entry => <li key={entry.id}><div><strong>{entry.description}</strong><span>{date(entry.createdAt)}{entry.modelId ? ` · ${entry.modelId}` : ""}</span>{entry.usage && <><span>{entry.usage.callKind === "repair" ? "Repair" : "Generation"} · {entry.usage.chargedCredits} credits charged · {entry.usage.source === "reported" ? "Provider-reported" : "Estimated"} usage</span><span>{entry.usage.inputTokens.toLocaleString()} input · {entry.usage.outputTokens.toLocaleString()} output tokens</span>{entry.usage.generationId && <span>Generation ID: {entry.usage.generationId}</span>}{entry.usage.providerRequestId && <span>Provider request ID: {entry.usage.providerRequestId}</span>}</>}</div><span className={entry.credits > 0 ? "credit-positive" : "credit-neutral"}>{entry.credits > 0 ? "+" : ""}{entry.credits.toLocaleString()}</span></li>)}</ul>}
      {cursor && <button className="account-secondary" disabled={busy} onClick={() => void load(cursor)}>Load older activity</button>}
    </>}
  </section>;
}
