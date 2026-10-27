"use client";

import { useEffect, useState } from "react";

type Status = { enabled: boolean; eligible: boolean; usedToday: number; remainingToday: number; rewardCredits: number; claimPending: boolean; creditsPerAd: number; expiresAfterDays: number; adUnitPath: string | null };
type RewardedEvent = { slot: AdSlot; makeRewardedVisible?: () => void };
type AdSlot = { addService: (service: unknown) => AdSlot; getSlotElementId: () => string; destroy?: () => void };
type GPT = {
  cmd: Array<() => void> & { push: (callback: () => void) => void };
  pubads: () => { addEventListener: (name: string, callback: (event: RewardedEvent) => void) => void; removeEventListener?: (name: string, callback: (event: RewardedEvent) => void) => void };
  defineOutOfPageSlot: (path: string, format: unknown) => AdSlot | null;
  display: (slot: AdSlot) => void;
  destroySlots: (slots?: AdSlot[]) => boolean;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  enableServices: () => void;
  enableSingleRequest: () => void;
};
declare global { interface Window { googletag?: GPT } }
let gptLoad: Promise<GPT> | null = null;
let gptServicesEnabled = false;

function loadGPT(): Promise<GPT> {
  if (gptLoad) return gptLoad;
  const loading: Promise<GPT> = new Promise<GPT>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    tag.onload = () => {
      const gpt = window.googletag;
      if (!gpt) { reject(new Error("The ad service did not initialize.")); return; }
      gpt.cmd.push(() => resolve(gpt));
    };
    tag.onerror = () => reject(new Error("The ad service could not be reached."));
    document.head.appendChild(tag);
  });
  gptLoad = loading.catch(error => { gptLoad = null; throw error; });
  return gptLoad!;
}

async function post(action: string, claimId?: string) {
  const response = await fetch("/api/billing/rewarded-ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, claimId }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The reward request failed.");
  return data;
}

export function RewardedAds({ onReward }: { onReward?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    const response = await fetch("/api/billing/rewarded-ads", { cache: "no-store" });
    if (!response.ok) return;
    setStatus(await response.json());
  }
  useEffect(() => { void refresh(); }, []);

  async function watch() {
    setBusy(true); setNotice("");
    let claimId: string | undefined;
    let rewarded = false;
    let slot: AdSlot | null = null;
    let gpt: GPT | null = null;
    let cleanupEvents = () => {};
    try {
      const claim = await post("start");
      claimId = claim.claimId;
      gpt = await loadGPT();
      await new Promise<void>((resolve, reject) => gpt!.cmd.push(() => {
        const path = status?.adUnitPath;
        if (!path) { reject(new Error("Rewarded ads are not configured yet.")); return; }
        slot = gpt!.defineOutOfPageSlot(path, gpt!.enums.OutOfPageFormat.REWARDED);
        if (!slot) { reject(new Error("Rewarded ads are not available in this browser right now.")); return; }
        slot.addService(gpt!.pubads());
        const pubads = gpt!.pubads();
        let settled = false;
        let timer: ReturnType<typeof setTimeout>;
        const cleanup = () => {
          clearTimeout(timer);
          pubads.removeEventListener?.("rewardedSlotReady", ready);
          pubads.removeEventListener?.("rewardedSlotGranted", granted);
          pubads.removeEventListener?.("rewardedSlotClosed", closed);
        };
        cleanupEvents = cleanup;
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          pubads.removeEventListener?.("rewardedSlotReady", ready);
          if (error) reject(error); else resolve();
        };
        const ready = (event: RewardedEvent) => {
          if (event.slot !== slot) return;
          if (!event.makeRewardedVisible) { finish(new Error("This ad could not be opened.")); return; }
          event.makeRewardedVisible();
          finish();
        };
        const granted = async (event: RewardedEvent) => {
          if (event.slot !== slot || !claimId || rewarded) return;
          rewarded = true;
          try {
            const result = await post("grant", claimId);
            if (result.granted) setNotice("1 credit added. It expires in 7 days.");
            else setNotice("The ad finished, but this reward could not be added. Refresh your balance.");
            await refresh();
            if (result.granted) onReward?.();
          } catch (error) { setNotice(error instanceof Error ? error.message : "The reward could not be added."); }
          finally { setBusy(false); }
        };
        const closed = async (event: RewardedEvent) => {
          if (event.slot !== slot) return;
          if (!settled) finish(new Error("The ad closed before it was ready."));
          cleanup();
          if (!rewarded && claimId) { await post("cancel", claimId).catch(() => undefined); setNotice("Ad closed. No credit was used or earned."); }
          setBusy(false);
          gpt!.destroySlots([slot!]);
          void refresh();
        };
        pubads.addEventListener("rewardedSlotReady", ready);
        pubads.addEventListener("rewardedSlotGranted", granted);
        pubads.addEventListener("rewardedSlotClosed", closed);
        timer = setTimeout(() => finish(new Error("No ad became available. Please try again later.")), 30_000);
        if (!gptServicesEnabled) {
          gpt!.enableSingleRequest();
          gpt!.enableServices();
          gptServicesEnabled = true;
        }
        gpt!.display(slot!);
      }));
      if (!slot) throw new Error("No ad was available. Please try again later.");
    } catch (error) {
      if (claimId && !rewarded) await post("cancel", claimId).catch(() => undefined);
      cleanupEvents();
      if (gpt && slot) gpt.destroySlots([slot]);
      setNotice(error instanceof Error ? error.message : "The ad could not be started.");
      setBusy(false);
      void refresh();
    }
  }

  if (!status?.eligible || !status.enabled) return null;
  return <div className="rewarded-ads" aria-live="polite">
    <strong>Earn credits with an ad</strong>
    <p>You can choose to watch up to 5 ads per day. Each completed ad earns 1 credit, which expires 7 days after you earn it. Ad length and availability vary. Skipping is always okay.</p>
    <button className="account-secondary" disabled={busy || status.remainingToday <= 0 || status.claimPending} onClick={() => void watch()}>{busy ? "Ad in progress…" : status.remainingToday <= 0 ? "Daily limit reached" : "Watch an ad for 1 credit"}</button>
    <small>{status.usedToday} of 5 ads used today · {status.rewardCredits} ad credits available</small>
    {notice && <p className="account-notice" role="status">{notice}</p>}
  </div>;
}
