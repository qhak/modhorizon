import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import "./pricing.css";

export const metadata: Metadata = { title: "Plans & credits — ModHorizon" };

// Plans as published on the team's hosted build. Payments are not connected in this codebase.
const PLANS = [
  { name: "Free", description: "Try the workspace with a small weekly allowance.", price: "$0.00", period: "week", credits: "10 credits each week", features: ["10 credits each week", "Economy models", "Community support"], extra: null },
  { name: "Starter", description: "For building and iterating on personal projects.", price: "$14.99", period: "month", credits: "350 credits each month", features: ["350 credits each month", "Every model", "Project history"], extra: "$0.07" },
  { name: "Pro", description: "More room for regular creation and larger ideas.", price: "$49.99", period: "month", credits: "1,500 credits each month", features: ["1,500 credits each month", "Every model", "Priority generation", "Advanced projects"], extra: "$0.04", featured: true },
  { name: "Studio", description: "A larger monthly allowance for power users.", price: "$99.99", period: "month", credits: "4,000 credits each month", features: ["4,000 credits each month", "Every model", "Multiple projects", "Concurrent builds"], extra: "$0.025" },
];

export default function Pricing() {
  return (
    <main className="pricing-page">
      <header className="pricing-nav">
        <Link className="pricing-back" href="/"><ArrowLeft size={15} aria-hidden="true" /> ModHorizon</Link>
        <div className="pricing-nav-actions">
          <Link className="pricing-workspace" href="/create">Open workspace <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </header>
      <section className="pricing-intro">
        <span className="eyebrow"><Sparkles size={13} aria-hidden="true" /> PLANS &amp; CREDITS</span>
        <h1>Pick your pace.</h1>
        <p>Credits cover AI generation. Choose the model for each build; paid plans can use every connected model.</p>
      </section>
      <section className="pricing-grid" aria-label="Plans">
        {PLANS.map((plan) => (
          <article key={plan.name} className={`pricing-card${plan.featured ? " pricing-card-featured" : ""}`}>
            {plan.featured && <span className="pricing-badge">POPULAR</span>}
            <div className="pricing-card-head">
              <div>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>
            </div>
            <div className="pricing-price">{plan.price}<span>/{plan.period}</span></div>
            <div className="pricing-credit-count">{plan.credits}</div>
            <ul>
              {plan.features.map((feature) => <li key={feature}><Check size={14} aria-hidden="true" />{feature}</li>)}
            </ul>
            <div className="pricing-extra">
              Extra credits <strong>{plan.extra ?? "—"}</strong>
              <span>{plan.extra ? "per credit · manual top-ups" : "Paid plans only"}</span>
            </div>
            <button type="button" className={`pricing-cta${plan.extra ? "" : " pricing-cta-muted"}`} disabled>
              {plan.extra ? "Payments not configured" : "Free plan"}
            </button>
          </article>
        ))}
      </section>
      <p className="pricing-credit-policy">Monthly credits reset on renewal. Purchased top-up credits carry over and are used after your monthly credits.</p>
      <p className="pricing-footnote">Model costs are estimates based on configured provider token rates. Failed generation attempts refund reserved credits. Credit packs are manual; balance top-ups never run automatically.</p>
    </main>
  );
}
