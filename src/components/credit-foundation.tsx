import { ArrowUpRight, Gift, Users } from "lucide-react";

/** No account ledger exists yet. Never substitute the proposed rewards for a balance. */
export function CreditFoundation() {
  return <div className="credit-foundation">
    <article><Gift size={20} /><span className="landing-label">WELCOME BONUS · PLANNED</span>
      <h3>A little head start.</h3><p><strong>5 signup credits</strong> when accounts and rewards launch. No credit card required.</p>
      <div className="credit-row"><span>Credit balance</span><strong>Not connected</strong></div>
    </article>
    <article><Users size={20} /><span className="landing-label">EARN CREDITS · PLANNED</span>
      <h3>Build a bigger community.</h3><p>Refer a creator. Earn <strong>25 bonus credits</strong> after their first legitimate project is verified.</p>
      <div className="credit-row"><span>Referral progress</span><strong>Available at launch <ArrowUpRight size={13} /></strong></div>
    </article>
  </div>;
}
