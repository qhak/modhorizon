import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database, D1Result, D1Statement } from "../src/lib/billing-db";
import { renewalCreditStatements, initialSubscriptionStatements } from "../src/lib/subscription-credits";
import { paidTopupStatements } from "../src/lib/credit-purchases";
import { validateTopup, minimumTopupCredits, topupAmountCents } from "../src/lib/topup-pricing";
import { downgradeComplimentaryAccount, subscriptionCancellationState } from "../src/lib/plan-downgrade";
import { holdCredits, completeCreditReservation } from "../src/lib/credit-reservations";
import { beginRewardedAdClaim, grantRewardedAdClaim, expireRewardedAdCredits } from "../src/lib/rewarded-ads";
import { configuredSocialRewardCampaigns, recordSocialRewardReview, assertSocialRewardCanSubmit, expireSocialRewardCredits } from "../src/lib/social-rewards";

// Execute the production SQL and migrations against SQLite, including transaction rollback.
class Statement implements D1Statement {
  constructor(private sqlite: DatabaseSync, private query: string, private values: SQLInputValue[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.sqlite, this.query, values as SQLInputValue[]); }
  async first<T>(column?: string): Promise<T | null> {
    const row = this.sqlite.prepare(this.query).get(...this.values);
    return (column ? row?.[column] : row) as T ?? null;
  }
  async all<T>(): Promise<D1Result<T>> {
    return { results: this.sqlite.prepare(this.query).all(...this.values) as T[], meta: { changes: 0 } };
  }
  execute<T>(): D1Result<T> {
    return { meta: { changes: Number(this.sqlite.prepare(this.query).run(...this.values).changes) } };
  }
  async run<T>() { return this.execute<T>(); }
}

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const name of ["0001_billing.sql", "0002_generation_reservations.sql", "0003_credit_buckets.sql", "0004_account_identity.sql", "0005_scheduled_cancellation.sql", "0006_community.sql", "0007_moderation_and_deletion.sql","0008_deletion_activity_guard.sql","0009_rewarded_ads.sql","0010_social_rewards.sql","0011_generation_usage.sql"])
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  sqlite.prepare(`INSERT INTO billing_accounts(id,credit_balance,allowance_credits,created_at,updated_at)
    VALUES('owner',100,100,0,0),('other',100,100,0,0)`).run();
  const db: D1Database = {
    prepare(query) { return new Statement(sqlite, query); },
    async batch<T>(statements: D1Statement[]): Promise<D1Result<T>[]> {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map(statement => (statement as Statement).execute<T>());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const balance = () => Number(sqlite.prepare("SELECT credit_balance FROM billing_accounts WHERE id='owner'").get()!.credit_balance);
  const ledger = () => sqlite.prepare("SELECT delta,reason FROM credit_ledger WHERE account_id='owner'").all();
  return { db, sqlite, balance, ledger };
}

test("duplicate settlement and a later refund charge only once", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const id = (await holdCredits(db, "owner", "gpt-6-luna", 40))!;
    assert.equal(balance(), 60);
    assert.equal(await completeCreditReservation(db, "owner", id, "settled", 12), 12);
    assert.equal(balance(), 88);
    await completeCreditReservation(db, "owner", id, "settled", 12);
    await completeCreditReservation(db, "owner", id, "refunded");
    assert.equal(balance(), 88);
    assert.equal(ledger().length, 2);
    assert.equal(ledger().reduce((sum, row) => sum + Number(row.delta), 0), -12);
  } finally { sqlite.close(); }
});

test("settlement records usage atomically, isolates it by account, and cannot overwrite it on retry", async () => {
  const { db, sqlite } = database();
  const { creditHistory } = await import("../src/lib/credit-history");
  try {
    const id = (await holdCredits(db, "owner", "gpt-6-luna", 4, { generationId: "generation-1", callKind: "generation" }))!;
    const usage = { inputTokens: 2500, outputTokens: 14000, source: "reported" as const, inputRate: .1, outputRate: .5, providerRequestId: "req-123" };
    await completeCreditReservation(db, "owner", id, "settled", 2, usage);
    await completeCreditReservation(db, "owner", id, "settled", 4, { ...usage, outputTokens: 99999 });
    const row = sqlite.prepare("SELECT input_tokens, output_tokens, input_rate, output_rate, charged_credits FROM generation_credit_reservations WHERE id=?").get(id)!;
    assert.deepEqual({ ...row }, { input_tokens: 2500, output_tokens: 14000, input_rate: .1, output_rate: .5, charged_credits: 2 });
    const owner = await creditHistory(db, "owner", null);
    const entry = owner.entries.find(item => item.usage);
    assert.deepEqual(entry?.usage, { generationId: "generation-1", callKind: "generation", inputTokens: 2500, outputTokens: 14000, source: "reported", chargedCredits: 2, providerRequestId: "req-123" });
    assert.doesNotMatch(JSON.stringify(await creditHistory(db, "other", null)), /req-123|generation-1/);
  } finally { sqlite.close(); }
});

test("concurrent refund and settlement cannot both credit the same reservation", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const id = (await holdCredits(db, "owner", "gpt-6-luna", 40))!;
    await Promise.all([
      completeCreditReservation(db, "owner", id, "refunded"),
      completeCreditReservation(db, "owner", id, "settled", 10),
      completeCreditReservation(db, "owner", id, "refunded"),
    ]);
    assert.ok(balance() === 100 || balance() === 90);
    assert.equal(ledger().length, 2);
    assert.equal(100 + ledger().reduce((sum, row) => sum + Number(row.delta), 0), balance());
  } finally { sqlite.close(); }
});

test("racing holds cannot overspend, and rejected holds create no ledger entry", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const ids = await Promise.all([holdCredits(db, "owner", "model", 80), holdCredits(db, "owner", "model", 80)]);
    assert.equal(ids.filter(Boolean).length, 1);
    assert.equal(balance(), 20);
    assert.equal(ledger().length, 1);
  } finally { sqlite.close(); }
});

test("reservations enforce ownership, reject invalid amounts and cap charges at the hold", async () => {
  const { db, sqlite, balance } = database();
  try {
    for (const amount of [-1, 0, 0.5, NaN, Infinity])
      await assert.rejects(holdCredits(db, "owner", "model", amount));
    const id = (await holdCredits(db, "owner", "model", 25))!;
    await assert.rejects(completeCreditReservation(db, "other", id, "refunded"), /not found/);
    await assert.rejects(completeCreditReservation(db, "owner", id, "settled", -10));
    assert.equal(balance(), 75);
    assert.equal(await completeCreditReservation(db, "owner", id, "settled", 90), 25);
    assert.equal(balance(), 75);
  } finally { sqlite.close(); }
});

test("a failed ledger insert rolls back the debit and reservation together", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    sqlite.exec("CREATE TRIGGER reject_ledger BEFORE INSERT ON credit_ledger BEGIN SELECT RAISE(ABORT,'simulated outage'); END");
    await assert.rejects(holdCredits(db, "owner", "model", 40), /simulated outage/);
    assert.equal(balance(), 100);
    assert.equal(ledger().length, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM generation_credit_reservations").get()!.total, 0);
  } finally { sqlite.close(); }
});

test("a failed completion leaves the hold intact and can be retried safely", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const id = (await holdCredits(db, "owner", "model", 40))!;
    const usage = { inputTokens: 100, outputTokens: 200, source: "reported" as const, inputRate: 1, outputRate: 2 };
    sqlite.exec("CREATE TRIGGER reject_ledger BEFORE INSERT ON credit_ledger BEGIN SELECT RAISE(ABORT,'simulated outage'); END");
    await assert.rejects(completeCreditReservation(db, "owner", id, "settled", 12, usage), /simulated outage/);
    assert.equal(balance(), 60);
    assert.equal(sqlite.prepare("SELECT state FROM generation_credit_reservations WHERE id=?").get(id)!.state, "held");
    assert.equal(sqlite.prepare("SELECT input_tokens FROM generation_credit_reservations WHERE id=?").get(id)!.input_tokens, null);
    sqlite.exec("DROP TRIGGER reject_ledger");
    await completeCreditReservation(db, "owner", id, "settled", 12, usage);
    assert.equal(balance(), 88);
    assert.equal(sqlite.prepare("SELECT input_tokens FROM generation_credit_reservations WHERE id=?").get(id)!.input_tokens, 100);
    assert.equal(ledger().length, 2);
  } finally { sqlite.close(); }
});

test("monthly credits spend first and purchased refunds survive allowance reset", async () => {
  const { db, sqlite, balance } = database();
  try {
    sqlite.exec("UPDATE billing_accounts SET credit_balance=150,purchased_credits=50 WHERE id='owner'");
    const id = (await holdCredits(db,"owner","model",120))!;
    assert.equal(balance(),30);
    const held = sqlite.prepare("SELECT allowance_credits,purchased_credits FROM billing_accounts WHERE id='owner'").get()!;
    assert.equal(held.allowance_credits,0); assert.equal(held.purchased_credits,30);
    sqlite.exec("UPDATE billing_accounts SET allowance_period=allowance_period+1,allowance_credits=1500,credit_balance=1500+purchased_credits WHERE id='owner'");
    await completeCreditReservation(db,"owner",id,"settled",90);
    // Old monthly refund (10) expires; purchased refund (20) persists.
    assert.equal(balance(),1550);
    const fresh = sqlite.prepare("SELECT allowance_credits,purchased_credits FROM billing_accounts WHERE id='owner'").get()!;
    assert.equal(fresh.allowance_credits,1500); assert.equal(fresh.purchased_credits,50);
  } finally {sqlite.close();}
});
test("old allowance refunds never inflate a new weekly allowance", async () => {
  const {db,sqlite,balance}=database();
  try {
    const id=(await holdCredits(db,"owner","model",40))!;
    sqlite.exec("UPDATE billing_accounts SET allowance_period=allowance_period+1,allowance_credits=10,credit_balance=10 WHERE id='owner'");
    await Promise.all([completeCreditReservation(db,"owner",id,"refunded"),completeCreditReservation(db,"owner",id,"refunded")]);
    assert.equal(balance(),10);
  } finally {sqlite.close();}
});

test("rewarded ads enforce five grants per UTC day and cannot replay a claim", async () => {
  const {db,sqlite,balance}=database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET auth_subject='verified-user' WHERE id='owner'").run();
    const now=Date.UTC(2026,9,27,12);
    for(let i=0;i<5;i++) {
      const claim=await beginRewardedAdClaim(db,"owner",now+i);
      assert.equal((await grantRewardedAdClaim(db,"owner",claim.id,now+i)).granted,true);
      assert.equal((await grantRewardedAdClaim(db,"owner",claim.id,now+i)).granted,false);
    }
    await assert.rejects(beginRewardedAdClaim(db,"owner",now+10),/five-ad limit/);
    assert.equal(balance(),105);
    assert.equal(sqlite.prepare("SELECT rewarded_ad_credits FROM billing_accounts WHERE id='owner'").get()!.rewarded_ad_credits,5);
  } finally {sqlite.close();}
});

test("social reward campaign config accepts only safe official platform URLs", () => {
  const valid = { id: "instagram-follow", platform: "Instagram", title: "Follow ModHorizon", accountName: "ModHorizon", accountHandle: "@modhorizon", profileUrl: "https://www.instagram.com/modhorizon/", credits: 2 };
  assert.equal(configuredSocialRewardCampaigns(JSON.stringify([valid])).length, 1);
  for (const profileUrl of ["http://www.instagram.com/modhorizon", "https://instagram.com.evil.example/modhorizon", "https://user:pass@instagram.com/modhorizon", "https://instagram.com/modhorizon?next=bad"]) {
    assert.equal(configuredSocialRewardCampaigns(JSON.stringify([{ ...valid, profileUrl }])).length, 0, profileUrl);
  }
  assert.equal(configuredSocialRewardCampaigns("not-json").length, 0);
});

test("social screenshot rewards grant once, and rejected screenshots grant nothing", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET auth_subject='verified-owner',allowance_credits=0,credit_balance=0 WHERE id='owner'").run();
    const campaign = { id: "youtube-follow", platform: "YouTube" as const, title: "Follow", accountName: "ModHorizon", accountHandle: "modhorizon", profileUrl: "https://www.youtube.com/@modhorizon", credits: 2 };
    const now = Date.now();
    assert.deepEqual(await recordSocialRewardReview(db, "owner", campaign, { approved: true, note: "accepted" }, now), { recorded: true, approved: true, credits: 2 });
    assert.equal(balance(), 2);
    assert.equal(sqlite.prepare("SELECT social_reward_credits FROM billing_accounts WHERE id='owner'").get()!.social_reward_credits, 2);
    await assert.rejects(assertSocialRewardCanSubmit(db, "owner", campaign.id, now + 1), /already submitted/);
    await assert.rejects(recordSocialRewardReview(db, "owner", campaign, { approved: true, note: "replay" }, now + 1), /already submitted/);
    assert.equal(balance(), 2);

    const rejectedCampaign = { ...campaign, id: "instagram-follow" };
    assert.deepEqual(await recordSocialRewardReview(db, "owner", rejectedCampaign, { approved: false, note: "unclear" }, now + 2), { recorded: true, approved: false, credits: 0 });
    assert.equal(balance(), 2);
    assert.equal(ledger().filter((row: any) => row.reason === "social_reward_grant").length, 1);
  } finally { sqlite.close(); }
});

test("social reward credits are spent before purchased credits and refunded only while unexpired", async () => {
  const { db, sqlite, balance } = database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET auth_subject='verified-owner',allowance_credits=0,purchased_credits=10,credit_balance=10 WHERE id='owner'").run();
    const campaign = { id: "tiktok-follow", platform: "TikTok" as const, title: "Follow", accountName: "ModHorizon", accountHandle: "modhorizon", profileUrl: "https://www.tiktok.com/@modhorizon", credits: 3 };
    const now = Date.now();
    await recordSocialRewardReview(db, "owner", campaign, { approved: true, note: "accepted" }, now);
    const reservation = (await holdCredits(db, "owner", "model", 5))!;
    assert.equal(balance(), 8);
    assert.equal(sqlite.prepare("SELECT social_reward_reserved FROM generation_credit_reservations WHERE id=?").get(reservation)!.social_reward_reserved, 3);
    assert.equal(sqlite.prepare("SELECT purchased_reserved FROM generation_credit_reservations WHERE id=?").get(reservation)!.purchased_reserved, 2);
    await completeCreditReservation(db, "owner", reservation, "refunded");
    assert.equal(balance(), 13);
    assert.equal(sqlite.prepare("SELECT social_reward_credits FROM billing_accounts WHERE id='owner'").get()!.social_reward_credits, 3);
    assert.equal(sqlite.prepare("SELECT purchased_credits FROM billing_accounts WHERE id='owner'").get()!.purchased_credits, 10);

    const second = (await holdCredits(db, "owner", "model", 3))!;
    sqlite.prepare("UPDATE social_reward_claims SET expires_at=? WHERE account_id='owner'").run(Date.now() - 1);
    await completeCreditReservation(db, "owner", second, "refunded");
    assert.equal(sqlite.prepare("SELECT social_reward_credits FROM billing_accounts WHERE id='owner'").get()!.social_reward_credits, 0);
    assert.equal(balance(), 10);
  } finally { sqlite.close(); }
});

test("social reward expiry is recorded once and reduces only the social reward bucket", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET auth_subject='verified-owner',allowance_credits=0,purchased_credits=5,credit_balance=5 WHERE id='owner'").run();
    const campaign = { id: "instagram-expiry", platform: "Instagram" as const, title: "Follow", accountName: "ModHorizon", accountHandle: "modhorizon", profileUrl: "https://www.instagram.com/modhorizon/", credits: 2 };
    const now = Date.now();
    await recordSocialRewardReview(db, "owner", campaign, { approved: true, note: "accepted" }, now);
    sqlite.prepare("UPDATE social_reward_claims SET expires_at=? WHERE account_id='owner'").run(now - 1);
    assert.equal(await expireSocialRewardCredits(db, "owner", now), 1);
    assert.equal(await expireSocialRewardCredits(db, "owner", now), 0);
    assert.equal(balance(), 5);
    assert.equal(sqlite.prepare("SELECT social_reward_credits FROM billing_accounts WHERE id='owner'").get()!.social_reward_credits, 0);
    assert.equal(ledger().filter((row: any) => row.reason === "social_reward_expiry").length, 1);
  } finally { sqlite.close(); }
});

test("an ad started before UTC midnight can still grant inside its ten-minute claim window", async () => {
  const {db,sqlite,balance}=database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET auth_subject='verified-user' WHERE id='owner'").run();
    const beforeMidnight=Date.UTC(2026,9,27,23,59,59);
    const claim=await beginRewardedAdClaim(db,"owner",beforeMidnight);
    assert.equal((await grantRewardedAdClaim(db,"owner",claim.id,beforeMidnight+2_000)).granted,true);
    assert.equal(balance(),101);
  } finally {sqlite.close();}
});

test("reward credits expire after seven days and leave the free allowance untouched", async () => {
  const {db,sqlite,balance,ledger}=database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET auth_subject='verified-user' WHERE id='owner'").run();
    const claim=await beginRewardedAdClaim(db,"owner",1000);
    await grantRewardedAdClaim(db,"owner",claim.id,1000);
    assert.equal(balance(),101);
    assert.equal(await expireRewardedAdCredits(db,"owner",1000+7*24*60*60*1000),1);
    assert.equal(balance(),100);
    const buckets=sqlite.prepare("SELECT allowance_credits,rewarded_ad_credits FROM billing_accounts WHERE id='owner'").get()!;
    assert.equal(buckets.allowance_credits,100); assert.equal(buckets.rewarded_ad_credits,0);
    assert.equal(ledger().filter(row=>row.reason==="rewarded_ad_expiry").length,1);
  } finally {sqlite.close();}
});

test("reward credits are spent after allowance and refunded only while their lot remains valid", async () => {
  const {db,sqlite,balance,ledger}=database();
  try {
    sqlite.prepare("UPDATE billing_accounts SET credit_balance=0,allowance_credits=0,purchased_credits=0 WHERE id='owner'").run();
    const now=Date.now();
    sqlite.prepare(`INSERT INTO rewarded_ad_claims(id,account_id,day_key,state,credits_remaining,created_at,updated_at,expires_at,granted_at)
      VALUES('claim_a','owner','2026-10-27','granted',1,?,?,?,?)`).run(now,now,now+7*24*60*60*1000,now);
    sqlite.prepare(`INSERT INTO rewarded_ad_claims(id,account_id,day_key,state,credits_remaining,created_at,updated_at,expires_at,granted_at)
      VALUES('claim_b','owner','2026-10-27','granted',1,?,?,?,?)`).run(now,now,now+7*24*60*60*1000,now);
    assert.equal(balance(),2);
    const hold=(await holdCredits(db,"owner","model",2))!;
    assert.equal(balance(),0);
    await completeCreditReservation(db,"owner",hold,"refunded");
    assert.equal(balance(),2);
    const second=(await holdCredits(db,"owner","model",2))!;
    sqlite.prepare("UPDATE rewarded_ad_claims SET expires_at=? WHERE id IN ('claim_a','claim_b')").run(Date.now()-1);
    await completeCreditReservation(db,"owner",second,"refunded");
    assert.equal(balance(),0);
    assert.equal(ledger().reduce((sum,row)=>sum+Number(row.delta),0),-2);
  } finally {sqlite.close();}
});

test("top-up quotes enforce exact minimum, maximum and integer input", () => {
  assert.deepEqual([minimumTopupCredits("starter"),minimumTopupCredits("pro"),minimumTopupCredits("studio")],[143,250,400]);
  assert.equal(topupAmountCents("starter",200),1400);
  assert.equal(topupAmountCents("studio",401),1003);
  for(const plan of ["starter","pro","studio"] as const) {
    assert.throws(()=>validateTopup(plan,minimumTopupCredits(plan)-1));
    assert.ok(validateTopup(plan,minimumTopupCredits(plan)).amountCents>=1000);
  }
  for(const credits of ["200",0,-1,150.5,100001,NaN,Infinity]) assert.throws(()=>validateTopup("starter",credits));
});
test("paid top-ups deliver once per session despite duplicate events and later cancellation", async () => {
  const {db,sqlite,balance}=database();
  try {
    const metadata={account_id:"owner",plan_key:"starter",purchase_kind:"credit_pack",credits:"200",currency:"usd",expected_amount_cents:"1400"};
    const item={id:"cs_paid",mode:"payment",payment_status:"paid",currency:"usd",amount_subtotal:1400,amount_total:1400,total_details:{amount_discount:0,amount_tax:0,amount_shipping:0}};
    const deliver=async (event:string,checkout=item)=>db.batch([
      db.prepare("INSERT OR IGNORE INTO stripe_webhook_events(event_id,event_type,received_at) VALUES(?,'checkout.session.completed',0)").bind(event),
      ...paidTopupStatements(db,checkout,metadata,event,0),
    ]);
    // Account is now Free: an earlier Starter purchase must still be credited.
    await deliver("evt_1"); await deliver("evt_1"); await deliver("evt_2");
    assert.equal(balance(),300);
    assert.equal(sqlite.prepare("SELECT purchased_credits FROM billing_accounts WHERE id='owner'").get()!.purchased_credits,200);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM credit_purchases").get()!.n,1);
    for(const overrides of [{amount_subtotal:1399},{amount_total:1399},{total_details:{amount_discount:200,amount_tax:1,amount_shipping:0}},{total_details:{amount_discount:-1,amount_tax:0,amount_shipping:0}},{currency:"eur"},{payment_status:"unpaid"}])
      assert.throws(()=>paidTopupStatements(db,{...item,...overrides},metadata,"evt_bad",0));
    const discounted = { ...item, id:"cs_discounted", amount_total:1120, total_details:{amount_discount:280,amount_tax:0,amount_shipping:0} };
    await deliver("evt_discount",discounted);
    assert.equal(balance(),500);
    assert.equal(sqlite.prepare("SELECT amount_cents FROM credit_purchases WHERE checkout_id='cs_discounted'").get()!.amount_cents,1120);
    for(const overrides of [{amount_total:0},{amount_total:1100,total_details:{amount_discount:280,amount_tax:0,amount_shipping:0}},{amount_total:1420,total_details:{amount_discount:0,amount_tax:20,amount_shipping:0}}])
      assert.throws(()=>paidTopupStatements(db,{...item,...overrides},metadata,"evt_bad_discount",0));
    assert.throws(()=>paidTopupStatements(db,item,{...metadata,credits:"100"},"evt_bad",0));
  } finally {sqlite.close();}
});
test("pre-migration paid 100-credit sessions remain deliverable",async()=>{
  const {db,sqlite,balance}=database();
  try {
    await db.batch([
      db.prepare("INSERT INTO stripe_webhook_events(event_id,event_type,received_at) VALUES('evt_legacy','checkout.session.completed',0)"),
      ...paidTopupStatements(db,{id:"cs_legacy",mode:"payment",payment_status:"paid",currency:"usd",amount_total:700},
        {account_id:"owner",plan_key:"starter",purchase_kind:"credit_pack",credits:"100"},"evt_legacy",0),
    ]);
    assert.equal(balance(),200);
  } finally {sqlite.close();}
});

test("renewals preserve purchased credits, expire prior allowance and dedupe stale invoices",async()=>{
  const {db,sqlite,balance}=database();
  try {
    sqlite.exec("UPDATE billing_accounts SET plan_key='pro',stripe_subscription_id='sub_1',purchased_credits=200,credit_balance=300 WHERE id='owner'");
    const deliver=async (event:string,invoice:string,period:number)=>db.batch([
      db.prepare("INSERT OR IGNORE INTO stripe_webhook_events(event_id,event_type,received_at) VALUES(?,'invoice.paid',0)").bind(event),
      ...renewalCreditStatements(db,"owner","sub_1",invoice,period,1500,event,0),
    ]);
    const hold=(await holdCredits(db,"owner","model",150))!;
    // Hold uses 100 monthly + 50 purchased, leaving 150 purchased.
    await deliver("evt_new","in_new",2000);
    assert.equal(balance(),1650);
    // Duplicate invoice on different event cannot replace credits used since renewal.
    const newHold=(await holdCredits(db,"owner","model",20))!;
    await deliver("evt_new_duplicate","in_new",2000);
    await deliver("evt_old","in_old",1000);
    await deliver("evt_same_period","in_other_same",2000);
    assert.equal(balance(),1630);
    await completeCreditReservation(db,"owner",hold,"refunded");
    assert.equal(balance(),1680); // Only the old purchased 50 is returned.
    await completeCreditReservation(db,"owner",newHold,"settled",10);
    assert.equal(balance(),1690);
    await deliver("evt_next","in_next",3000);
    assert.equal(balance(),1700);
    const delta=sqlite.prepare("SELECT SUM(delta) AS n FROM credit_ledger WHERE account_id='owner'").get()!.n;
    assert.equal(300+Number(delta),balance());
  } finally {sqlite.close();}
});
test("late or repeated initial checkout cannot replace an existing subscription",async()=>{
  const {db,sqlite,balance}=database();
  try {
    const deliver=async(event:string,checkout:string,sub:string)=>db.batch([
      db.prepare("INSERT OR IGNORE INTO stripe_webhook_events(event_id,event_type,received_at) VALUES(?,'checkout.session.completed',0)").bind(event),
      ...initialSubscriptionStatements(db,"owner",checkout,sub,"cus_1","pro",1500,event,0),
    ]);
    await deliver("evt_start","cs_start","sub_1");
    assert.equal(balance(),1500);
    await holdCredits(db,"owner","model",20);
    await deliver("evt_repeat","cs_start","sub_1");
    await deliver("evt_late","cs_old","sub_old");
    await deliver("evt_same_sub","cs_other","sub_1");
    assert.equal(balance(),1480);
    assert.equal(sqlite.prepare("SELECT stripe_subscription_id FROM billing_accounts WHERE id='owner'").get()!.stripe_subscription_id,"sub_1");
    const delta=sqlite.prepare("SELECT SUM(delta) AS n FROM credit_ledger WHERE account_id='owner'").get()!.n;
    assert.equal(100+Number(delta),balance());
  } finally {sqlite.close();}
});


test("complimentary downgrade keeps purchased credits, replaces allowance once, and leaves other accounts alone", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    sqlite.exec("UPDATE billing_accounts SET plan_key='starter',subscription_status='active',auth_subject='verified-owner',allowance_credits=350,purchased_credits=200,credit_balance=550 WHERE id='owner'");
    await downgradeComplimentaryAccount(db, "owner", 1792665600000);
    const row = sqlite.prepare("SELECT * FROM billing_accounts WHERE id='owner'").get()!;
    assert.equal(row.plan_key, "free");
    assert.equal(row.allowance_credits, 10);
    assert.equal(row.purchased_credits, 200);
    assert.equal(balance(), 210);
    assert.equal(row.allowance_period, 1);
    assert.equal(ledger().length, 1);
    assert.equal(ledger()[0].delta, -340);
    await assert.rejects(downgradeComplimentaryAccount(db, "owner"), /plan changed/);
    assert.equal(balance(), 210);
    assert.equal(ledger().length, 1);
    assert.equal(sqlite.prepare("SELECT credit_balance FROM billing_accounts WHERE id='other'").get()!.credit_balance, 100);
  } finally { sqlite.close(); }
});

test("immediate downgrade cannot bypass a Stripe subscription or act on an anonymous account", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    sqlite.exec("UPDATE billing_accounts SET plan_key='starter',auth_subject='verified-owner',stripe_subscription_id='sub_real' WHERE id='owner'");
    await assert.rejects(downgradeComplimentaryAccount(db, "owner"), /plan changed/);
    sqlite.exec("UPDATE billing_accounts SET stripe_subscription_id=NULL,auth_subject=NULL WHERE id='owner'");
    await assert.rejects(downgradeComplimentaryAccount(db, "owner"), /plan changed/);
    assert.equal(balance(), 100);
    assert.equal(ledger().length, 0);
  } finally { sqlite.close(); }
});

test("cancellation state supports Stripe item billing periods and absent legacy dates", () => {
  assert.deepEqual(subscriptionCancellationState({cancel_at_period_end: true, items:{data:[{current_period_end:1800000000}]}}), {scheduled:true,periodEnd:1800000000});
  assert.deepEqual(subscriptionCancellationState({cancel_at_period_end: false, current_period_end:1800000001}), {scheduled:false,periodEnd:1800000001});
  assert.deepEqual(subscriptionCancellationState({}), {scheduled:false,periodEnd:null});
});

test("credit history isolates accounts and paginates equal timestamps without missing or duplicating rows", async () => {
  const {creditHistory} = await import("../src/lib/credit-history");
  const {db,sqlite} = database();
  try {
    for(let i=0;i<31;i++) sqlite.prepare("INSERT INTO credit_ledger(id,account_id,delta,reason,created_at) VALUES(?, 'owner', 1, 'manual_credit_pack', 1000)").run(`entry-${String(i).padStart(2,"0")}`);
    sqlite.prepare("INSERT INTO credit_ledger(id,account_id,delta,reason,created_at) VALUES('private-other','other',999,'manual_credit_pack',2000)").run();
    const first=await creditHistory(db,"owner",null);
    assert.equal(first.entries.length,25);
    assert.ok(first.nextCursor);
    const second=await creditHistory(db,"owner",first.nextCursor);
    assert.equal(second.entries.length,6);
    assert.equal(second.nextCursor,null);
    const all=[...first.entries,...second.entries];
    assert.equal(new Set(all.map(row=>row.id)).size,31);
    assert.ok(all.every(row=>row.credits===1 && row.description==="Extra credits purchased"));
    assert.doesNotMatch(JSON.stringify(first),/private-other|stripe_event/);
    for(const cursor of ['broken',Buffer.from(JSON.stringify([1000,"x' OR 1=1"])).toString('base64url')])
      await assert.rejects(creditHistory(db,"owner",cursor),/Invalid credit history cursor/);
  } finally {sqlite.close();}
});
