"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, Sparkles } from "lucide-react";
import { BILLING_PLANS, type PlanId } from "@/lib/billing-catalog";

type Account = { plan: PlanId; credits: number; subscriptionStatus: string } | null;
const paidPlans: PlanId[] = ["starter", "pro", "studio"];
const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const extraRate = (milliUsd: number | null) => milliUsd === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(milliUsd / 1000);

export default function PricingPage() {
  const [account, setAccount] = useState<Account>(null);
  const [checkoutConfigured, setCheckoutConfigured] = useState(false);
  const [busy, setBusy] = useState<PlanId | "pack" | null>(null);
  const [message, setMessage] = useState("");

  async function loadAccount() {
    const session = await fetch("/api/billing/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!session.ok) throw new Error((await session.json()).error || "Account setup is unavailable.");
    const info = await fetch("/api/billing/account", { cache: "no-store" });
    const data = await info.json();
    if (!info.ok) throw new Error(data.error || "Could not load account details.");
    setAccount(data.account);
    setCheckoutConfigured(Boolean(data.billing?.checkoutConfigured));
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("billing") === "cancel") setMessage("Checkout was canceled. Your account and credits are unchanged.");
    if (query.get("billing") === "success") setMessage("Payment received. Your credit balance updates after Stripe confirms the payment.");
    loadAccount().catch((error) => setMessage(error instanceof Error ? error.message : "Billing is not available yet."));
  }, []);

  async function checkout(selection: PlanId | "pack") {
    setBusy(selection); setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection === "pack" ? { pack: "100" } : { plan: selection }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Could not start checkout.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout is unavailable.");
      setBusy(null);
    }
  }

  return (
    <main className="pricing-page">
      <header className="pricing-nav">
        <Link href="/" className="pricing-back"><ArrowLeft size={15} /> ModHorizon</Link>
        <Link href="/create" className="pricing-workspace">Open workspace <ArrowRight size={14} /></Link>
      </header>
      <section className="pricing-intro">
        <span className="eyebrow"><Sparkles size={13} /> PLANS & CREDITS</span>
        <h1>Pick your pace.</h1>
        <p>Credits cover AI generation. Choose the model for each build; paid plans can use every connected model.</p>
        {account && <div className="pricing-balance"><CreditCard size={15} /><strong>{account.credits} credits</strong><span>on {BILLING_PLANS[account.plan].name}</span></div>}
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
            {id === "free" ? <button className="pricing-cta pricing-cta-muted" disabled>{current ? "Your current plan" : "Free plan"}</button> : <button className="pricing-cta" disabled={!checkoutConfigured || busy !== null || current} onClick={() => void checkout(id)}>{busy === id ? "Connecting to Stripe…" : current ? "Your current plan" : checkoutConfigured ? `Choose ${plan.name}` : "Set up Stripe test mode"}</button>}
          </article>;
        })}
      </section>
      {account && account.plan !== "free" && <section className="credit-pack-card">
        <div><span className="eyebrow">MANUAL TOP-UP</span><h2>Need another 100 credits?</h2><p>Buy a one-time pack at your plan’s listed rate. ModHorizon never charges automatically when your balance runs low.</p></div>
        <button className="pricing-cta" disabled={!checkoutConfigured || busy !== null || account.subscriptionStatus !== "active"} onClick={() => void checkout("pack")}>{busy === "pack" ? "Connecting to Stripe…" : checkoutConfigured ? `Buy 100 credits · ${dollars(Math.ceil(BILLING_PLANS[account.plan].extraCreditMilliUsd! * 100 / 10))}` : "Stripe test mode required"}</button>
      </section>}
      <p className="pricing-footnote">Model costs are estimates based on configured provider token rates. Failed generation attempts refund reserved credits. Credit packs are manual; balance top-ups never run automatically.</p>
    </main>
  );
}
