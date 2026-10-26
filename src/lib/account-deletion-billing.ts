import { CommunityError } from "./community";
import { stripeMode } from "./stripe-config";
import type { DeletionBilling } from "./account-deletion";
import type { D1Database } from "./billing-db";

async function stripe(secret:string, path:string, method="GET") {
  if(!stripeMode(secret)) throw new CommunityError("Billing cancellation is unavailable. Please try again later.",503);
  const response=await fetch(`https://api.stripe.com/v1/${path}`,{method,redirect:"manual",signal:AbortSignal.timeout(20_000),headers:{Authorization:`Bearer ${secret}`}});
  if(!response.ok) throw new CommunityError("Could not confirm billing cancellation. Deletion is paused; please retry.",503);
  return await response.json() as Record<string,unknown>;
}
export async function expireDeletionCheckout(secret:string, id:string) {
  if(!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new CommunityError("Invalid checkout reference.",503);
  const result=await stripe(secret,`checkout/sessions/${encodeURIComponent(id)}/expire`,"POST");
  if(result.id!==id || result.status!=="expired") throw new CommunityError("Checkout expiration was not confirmed.",503);
}
export async function stopAccountBilling(secret:string|undefined, account:DeletionBilling) {
  if(!secret) throw new CommunityError("Billing cancellation is not configured. Deletion cannot proceed.",503);
  // Older releases did not retain uncompleted checkout IDs. Search bounded open
  // pages and expire only sessions tied to this server-owned billing account.
  let cursor="";
  for(let page=0;page<20;page++) {
    const list=await stripe(secret,`checkout/sessions?status=open&limit=100${cursor?`&starting_after=${encodeURIComponent(cursor)}`:""}`);
    if(!Array.isArray(list.data)) throw new CommunityError("Invalid checkout response.",503);
    for(const value of list.data) {
      const session=value as Record<string,unknown>;
      if(session.client_reference_id===account.id) await expireDeletionCheckout(secret,String(session.id));
    }
    if(!list.has_more) break;
    if(page===19 || !list.data.length) throw new CommunityError("Billing has too many pending sessions to verify now. Please retry later.",503);
    cursor=String((list.data.at(-1) as Record<string,unknown>).id);
  }
  // Include subscriptions whose completion webhook has not reached D1 yet.
  const subscriptions=new Map<string,Record<string,unknown>>();
  if(account.stripe_subscription_id) {
    const sub=await stripe(secret,`subscriptions/${encodeURIComponent(account.stripe_subscription_id)}`);
    if(sub.id!==account.stripe_subscription_id || (account.stripe_customer_id && sub.customer!==account.stripe_customer_id)) throw new CommunityError("Subscription ownership could not be verified.",503);
    subscriptions.set(String(sub.id),sub);
  }
  cursor="";
  for(let page=0;page<20;page++) {
    const list=await stripe(secret,`subscriptions?status=all&limit=100${cursor?`&starting_after=${encodeURIComponent(cursor)}`:""}`);
    if(!Array.isArray(list.data)) throw new CommunityError("Invalid subscription response.",503);
    for(const value of list.data) {
      const sub=value as Record<string,unknown>, metadata=sub.metadata as Record<string,unknown>|undefined;
      if(metadata?.account_id===account.id) subscriptions.set(String(sub.id),sub);
    }
    if(!list.has_more) break;
    if(page===19 || !list.data.length) throw new CommunityError("Too many subscriptions to verify now. Please retry later.",503);
    cursor=String((list.data.at(-1) as Record<string,unknown>).id);
  }
  for(const [id,sub] of subscriptions) {
    if(["canceled","incomplete_expired"].includes(String(sub.status))) continue;
    const result=await stripe(secret,`subscriptions/${encodeURIComponent(id)}?invoice_now=false&prorate=false`,"DELETE");
    if(result.id!==id || result.status!=="canceled" || result.customer!==sub.customer)
      throw new CommunityError("Subscription cancellation was not confirmed. Deletion is paused.",503);
  }
}

/** Only call for a signature-verified Stripe event. Failed cleanup must leave
 * the event unacknowledged so Stripe can retry it, even after local deletion. */
export async function guardDeletedBillingEvent(db:D1Database, secret:string|undefined, type:string, item:Record<string,unknown>) {
  const metadata=item.metadata as Record<string,unknown>|undefined;
  const accountId=typeof metadata?.account_id==="string" ? metadata.account_id : null;
  const subscription=type.startsWith("customer.subscription.") ? item.id : item.subscription;
  const subscriptionId=typeof subscription==="string" ? subscription : null;
  if(!accountId && !subscriptionId) return false;
  const row=await db.prepare(`SELECT id,stripe_customer_id,stripe_subscription_id,deleted_at FROM billing_accounts
    WHERE deletion_requested_at IS NOT NULL AND (id=? OR stripe_subscription_id=?)`).bind(accountId,subscriptionId).first<DeletionBilling>();
  if(!row) return false;
  if(type!=="customer.subscription.deleted") {
    await stopAccountBilling(secret,{...row,
      stripe_subscription_id:subscriptionId || row.stripe_subscription_id,
      stripe_customer_id:subscriptionId && typeof item.customer==="string" ? item.customer : row.stripe_customer_id});
  }
  return true;
}
