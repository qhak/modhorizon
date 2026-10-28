"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { RewardedAds } from "@/app/account/rewarded-ads";

type Campaign = { id: string; platform: string; title: string; accountName: string; accountHandle: string; profileUrl: string; credits: number };
type Claim = { status: "approved" | "rejected"; createdAt: number; expiresAt: number };
type RewardsData = { enabled: boolean; plan: string; campaigns: Campaign[]; claims: Record<string, Claim>; socialRewardCredits: number };

async function fileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Screenshot could not be read."));
    reader.onerror = () => reject(new Error("Screenshot could not be read."));
    reader.readAsDataURL(file);
  });
}

const shortDate = (value: number) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function RewardsHub() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setError("");
    try {
      const response = await fetch("/api/rewards", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load rewards.");
      setData(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load rewards."); }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(campaign: Campaign, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 768 * 1024) {
      setNotice("Choose a PNG or JPEG screenshot no larger than 768 KB."); return;
    }
    setBusyId(campaign.id); setNotice("");
    try {
      const dataUrl = await fileDataUrl(file);
      const response = await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id, dataUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Screenshot review failed.");
      setNotice(result.note || "Screenshot review complete.");
      await refresh();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Screenshot review failed."); }
    finally { setBusyId(""); }
  }

  return <div className="rewards-hub">
    {error && <div className="account-notice" role="alert">{error} <Link href="/account">Sign in to claim rewards</Link></div>}
    {!data && !error && <p className="account-intro">Loading rewards…</p>}
    {data && <>
      <div className="rewards-balance"><span>Social reward credits available</span><strong>{data.socialRewardCredits}</strong></div>
      {data.plan !== "free" && <p className="account-notice">These rewards are currently for Free accounts. Your existing credits and plan are unaffected.</p>}
      {data.plan === "free" && <section className="free-reward-section" aria-labelledby="ad-rewards-heading"><h2 id="ad-rewards-heading">Watch an ad</h2><p className="account-intro">Earn up to five credits a day by choosing to watch rewarded ads.</p><RewardedAds /></section>}
      <section className="free-reward-section" aria-labelledby="social-rewards-heading"><h2 id="social-rewards-heading">Follow ModHorizon</h2>
        <p className="account-intro">Follow an official account, then upload a screenshot showing its profile and the Following state. ModHorizon does not save the screenshot, but sends it to our AI provider to review this claim. Screenshots are a best-effort check and do not prove a follow is genuine or ongoing.</p>
        {!data.enabled || data.campaigns.length === 0 ? <p className="reward-empty">Social rewards are being set up. Check back soon.</p> : data.campaigns.map(campaign => {
          const claim = data.claims[campaign.id];
          return <article className="social-reward-card" key={campaign.id}>
            <div className="social-reward-copy"><span className="reward-platform">{campaign.platform} · @{campaign.accountHandle}</span><h3>{campaign.title}</h3><p>Earn {campaign.credits} credit{campaign.credits === 1 ? "" : "s"}. Reward credits expire after seven days.</p></div>
            <a className="social-profile-link" href={campaign.profileUrl} target="_blank" rel="noreferrer">Open official profile ↗</a>
            {claim ? <p className={claim.status === "approved" ? "reward-status reward-approved" : "reward-status reward-rejected"} role="status">{claim.status === "approved" ? `Accepted · submitted ${shortDate(claim.createdAt)}` : `Not accepted · submitted ${shortDate(claim.createdAt)}`}</p>
              : data.plan === "free" && <label className="reward-upload">{busyId === campaign.id ? "Checking screenshot…" : `Upload screenshot for ${campaign.credits} credit${campaign.credits === 1 ? "" : "s"}`}<input type="file" accept="image/png,image/jpeg" disabled={!!busyId} onChange={event => void submit(campaign, event)} /></label>}
          </article>;
        })}
      </section>
      {notice && <p className="account-notice" role="status">{notice}</p>}
      <p className="account-fine">One screenshot submission per reward. Rewards are for personal ModHorizon credits and cannot be exchanged for cash.</p>
    </>}
  </div>;
}
