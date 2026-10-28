import Link from "next/link";
import { VoidBackdrop } from "@/components/void-backdrop";
import RewardsHub from "./rewards-hub";
import "../account/account.css";

export const metadata = { title: "Free rewards | ModHorizon", description: "Find free ways to earn ModHorizon credits." };

export default function RewardsPage() {
  return <main className="account-shell rewards-shell"><VoidBackdrop />
    <nav><Link href="/">← ModHorizon</Link><Link href="/account">Your account</Link><Link href="/create">Open workspace →</Link></nav>
    <section className="account-card rewards-card"><div className="account-eyebrow">FREE CREDIT OPTIONS</div><h1>Rewards</h1>
      <p className="account-intro">See every free way to earn ModHorizon credits in one place.</p>
      <RewardsHub />
    </section>
  </main>;
}
