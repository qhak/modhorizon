import { Coins } from "lucide-react";

export function CreditBalance({ balance }: { balance: number | null }) {
  return <span className="db-credit" title={balance === null ? "A credit ledger has not been connected. No balance is assumed." : "Available credits"}>
    <Coins size={14} /><span>{balance === null ? "Credits unavailable" : `${balance.toLocaleString()} credits`}</span>
  </span>;
}
