"use client";

import "../landing.css";
import "./pricing.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, Sparkles } from "lucide-react";
import { BILLING_PLANS, type PlanId } from "@/lib/billing-catalog";
import { MAX_TOPUP_CREDITS, defaultTopupCredits, minimumTopupCredits, topupAmountCents } from "@/lib/topup-pricing";

type Account = { cancelAtPeriodEnd?: boolean; currentPeriodEnd?: number | null; plan: PlanId; credits: number; subscriptionStatus: string; allowanceCredits?: number; purchasedCredits?: number; authenticated?: boolean; email?: string | null } | null;
const paidPlans: PlanId[] = ["starter", "pro", "studio"];
const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const extraRate = (milliUsd: number | null) => milliUsd === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(milliUsd / 1000);

export default function PricingPage() {
  const [account, setAccount] = useState<Account>(null);
  const [checkoutConfigured, setCheckoutConfigured] = useState(false);
  const [busy, setBusy] = useState<PlanId | "pack" | null>(null);
  const [message, setMessage] = useState("");
  const [topupCredits, setTopupCredits] = useState("");
  const paidPlan = account && account.plan !== "free" ? account.plan : null;
  const quantity = Number(topupCredits);
  const minimum = paidPlan ? minimumTopupCredits(paidPlan) : 0;
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= minimum && quantity <= MAX_TOPUP_CREDITS;
  const topupTotal = paidPlan && validQuantity ? topupAmountCents(paidPlan, quantity) : null;

  async function loadAccount() {
    const session = await fetch("/api/billing/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!session.ok) throw new Error((await session.json()).error || "Account setup is unavailable.");
    const info = await fetch("/api/billing/account", { cache: "no-store" });
    const data = await info.json();
    if (!info.ok) throw new Error(data.error || "Could not load account details.");
    setAccount(data.account);
    if (data.account && data.account.plan !== "free") setTopupCredits(String(defaultTopupCredits(data.account.plan)));
    setCheckoutConfigured(Boolean(data.billing?.checkoutConfigured));
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("billing") === "cancel") setMessage("Checkout was canceled. Your account and credits are unchanged.");
    if (query.get("billing") === "success") setMessage("Payment received. Your credit balance updates after Stripe confirms the payment.");
    loadAccount().catch((error) => setMessage(error instanceof Error ? error.message : "Billing is not available yet."));
  }, []);

  async function checkout(selection: PlanId | "pack") {
    if (!account?.authenticated) {
      window.location.assign("/account");
      return;
    }
    if (selection === "pack" && !validQuantity) {
      setMessage(`Enter a whole number from ${minimum.toLocaleString()} to ${MAX_TOPUP_CREDITS.toLocaleString()} credits.`);
      return;
    }
    setBusy(selection); setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection === "pack" ? { credits: quantity } : { plan: selection }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign("/account");
        return;
      }
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Could not start checkout.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout is unavailable.");
      setBusy(null);
    }
  }

  async function downgrade() {
    setBusy("free"); setMessage("");
    try {
      const response = await fetch("/api/billing/downgrade", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change your plan.");
      await loadAccount();
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change your plan.");
    } finally { setBusy(null); }
  }

  return (
    <main className="pricing-page">
      <header className="pricing-nav">
        <Link href="/" className="pricing-back"><ArrowLeft size={15} /> ModHorizon</Link>
        <div className="pricing-nav-actions"><Link href="/account" className="pricing-workspace">{account?.authenticated ? "Account" : "Sign in"}</Link><Link href="/create" className="pricing-workspace">Open workspace <ArrowRight size={14} /></Link></div>
      </header>
      <section className="pricing-intro">
        <span className="eyebrow"><Sparkles size={13} /> PLANS & CREDITS</span>
        <h1>Pick your pace.</h1>
        <p>Credits cover AI generation. Choose the model for each build; paid plans can use every connected model.</p>
        {account && <div className="pricing-balance"><CreditCard size={15} /><strong>{account.credits} credits</strong><span>on {BILLING_PLANS[account.plan].name}</span></div>}
        {account && account.allowanceCredits !== undefined && account.purchasedCredits !== undefined && <p className="pricing-buckets">{account.allowanceCredits.toLocaleString()} {account.plan === "free" ? "weekly" : "monthly"} credits <span aria-hidden="true">·</span> {account.purchasedCredits.toLocaleString()} purchased credits</p>}
        {account?.cancelAtPeriodEnd && <p className="pricing-credit-policy">Your plan switches to Free {account.currentPeriodEnd ? `on ${new Date(account.currentPeriodEnd * 1000).toLocaleDateString()}` : "at the end of your billing period"}. Renewal is canceled; purchased credits are kept.</p>}
        {message && <div className="pricing-message" role="status">{message}</div>}
      </section>
      <section className="pricing-grid" aria-label="Plans">
        {(["free", ...paidPlans] as PlanId[]).map((id) => {
          const plan = BILLING_PLANS[id];
          const current = account?.plan === id;
          return <article key={id} className={`pricing-card ${id === "pro" ? "pricing-card-featured" : ""}`}>
            {id === "pro" && <span className="pricing-badge">POPULAR</span>}
            <div className="pricing-card-head"><div><h2>{plan.name}</h2><p>{plan.description}</p></div>{current && <span className="pricing-current">Current</span>}</div>
            <div className="pricing-price">{dollars(plan.priceCents)}<span>/{plan.interval}</span></div>
            <div className="pricing-credit-count">{id === "free" ? "10 credits each week" : `${plan.credits.toLocaleString()} credits each month`}</div>
            <ul>{plan.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul>
            <div className="pricing-extra">Extra credits <strong>{extraRate(plan.extraCreditMilliUsd)}</strong><span>{id === "free" ? "Paid plans only" : "per credit · manual top-ups"}</span></div>
            {id === "free" ? <button className="pricing-cta pricing-cta-muted" disabled={!account?.authenticated || current || busy !== null || account?.cancelAtPeriodEnd} onClick={() => void downgrade()}>{busy === "free" ? "Updating plan…" : current ? "Your current plan" : account?.cancelAtPeriodEnd ? "Downgrade scheduled" : account?.authenticated ? "Downgrade to Free" : "Free plan"}</button> : <button className="pricing-cta" disabled={!checkoutConfigured || busy !== null || current} onClick={() => void checkout(id)}>{busy === id ? "Connecting to Stripe…" : current ? "Your current plan" : checkoutConfigured ? `${account?.authenticated ? "Choose" : "Sign in to choose"} ${plan.name}` : "Payments not configured"}</button>}
          </article>;
        })}
      </section>
      <p className="pricing-credit-policy">Downgrade to Free anytime: paid access lasts until the end of your billing period. Complimentary plans switch immediately. Monthly credits reset on renewal. Purchased top-up credits carry over and are used after your monthly credits.</p>
      {account?.authenticated && paidPlan && <section className="credit-pack-card credit-topup-card" aria-labelledby="topup-heading">
        <div><span className="eyebrow">MANUAL TOP-UP</span><h2 id="topup-heading">Keep creating.</h2><p>Choose how many extra credits to buy at your {BILLING_PLANS[paidPlan].name} rate of {extraRate(BILLING_PLANS[paidPlan].extraCreditMilliUsd)} per credit. Minimum purchase: $10.00. Top-ups carry over; we never charge automatically when your balance runs low.</p>{account.subscriptionStatus !== "active" && <p className="topup-help">An active paid subscription is required to buy extra credits.</p>}</div>
        <form className="topup-form" onSubmit={(event) => { event.preventDefault(); void checkout("pack"); }}>
          <label htmlFor="topup-credits">Credits to buy</label>
          <input id="topup-credits" type="number" inputMode="numeric" min={minimum} max={MAX_TOPUP_CREDITS} step="1" value={topupCredits} onChange={(event) => setTopupCredits(event.target.value)} aria-describedby="topup-minimum topup-total" disabled={busy !== null} required />
          <p id="topup-minimum" className="topup-help">At least {minimum.toLocaleString()} credits ({dollars(topupAmountCents(paidPlan, minimum))}). Whole credits only.</p>
          <div id="topup-total" className="topup-total" aria-live="polite"><span>One-time total</span><strong>{topupTotal === null ? "—" : dollars(topupTotal)}</strong></div>
          <button type="submit" className="pricing-cta" disabled={!checkoutConfigured || busy !== null || account.subscriptionStatus !== "active" || !validQuantity}>{busy === "pack" ? "Connecting to Stripe…" : checkoutConfigured ? "Continue to checkout" : "Payments not configured"}</button>
        </form>
      </section>}
      <p className="pricing-footnote">Model costs are estimates based on configured provider token rates. Failed generation attempts refund reserved credits. Credit packs are manual; balance top-ups never run automatically.</p>
    </main>
  );
}
