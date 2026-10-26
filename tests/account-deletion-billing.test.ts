import assert from "node:assert/strict";
import test from "node:test";
import { stopAccountBilling, guardDeletedBillingEvent } from "../src/lib/account-deletion-billing";
import { createStripeCheckout } from "../src/lib/billing-service";
import type { D1Database } from "../src/lib/billing-db";
const secret=["sk","test","fixtureOnly"].join("_");
const account={id:"billing-owner",stripe_customer_id:"cus_owner",stripe_subscription_id:"sub_owner",deleted_at:null};

test("deletion expires only owned checkouts and cancels owned subscriptions including webhook-lagged ones",async()=>{
 const original=globalThis.fetch,calls:{url:string;method:string}[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=String(input),method=init?.method || "GET";calls.push({url,method});assert.equal(init?.redirect,"manual");
  if(url.includes("checkout/sessions?"))return Response.json({has_more:false,data:[{id:"cs_test_owner",client_reference_id:"billing-owner"},{id:"cs_test_other",client_reference_id:"other"}]});
  if(url.endsWith("cs_test_owner/expire"))return Response.json({id:"cs_test_owner",status:"expired"});
  if(url.endsWith("subscriptions/sub_owner"))return Response.json({id:"sub_owner",customer:"cus_owner",status:"active"});
  if(url.includes("subscriptions?"))return Response.json({has_more:false,data:[{id:"sub_lag",customer:"cus_new",status:"active",metadata:{account_id:"billing-owner"}},{id:"sub_other",customer:"cus_other",status:"active",metadata:{account_id:"other"}}]});
  if(method==="DELETE") {const id=new URL(url).pathname.split("/").pop();return Response.json({id,status:"canceled",customer:id==="sub_owner"?"cus_owner":"cus_new"});}
  throw new Error("Unexpected fixture request");
 };
 try{await stopAccountBilling(secret,account);assert.equal(calls.filter(c=>c.method==="DELETE").length,2);assert.ok(!calls.some(c=>c.url.includes("sub_other/")||c.url.includes("cs_test_other/")));}
 finally{globalThis.fetch=original;}
});
test("deletion rejects redirects and ownership mismatches before cancellation",async()=>{
 const original=globalThis.fetch;let deletes=0;
 try{
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:"https://untrusted.example"}});
  await assert.rejects(stopAccountBilling(secret,account),/cancellation|paused/i);
  globalThis.fetch=async(input,init)=>{if(init?.method==="DELETE")deletes++;return String(input).includes("checkout/sessions?")?Response.json({has_more:false,data:[]}):Response.json({id:"sub_owner",customer:"cus_other",status:"active"});};
  await assert.rejects(stopAccountBilling(secret,account),/ownership/i);assert.equal(deletes,0);
 }finally{globalThis.fetch=original;}
});
test("a checkout racing account deletion is expired and never returned to the caller",async()=>{
 const original=globalThis.fetch;let checks=0,expired=false;
 const db={prepare:()=>({bind(){return this;},async first(){return ++checks===1?null:{blocked:1};}})} as unknown as D1Database;
 globalThis.fetch=async(input)=>{
  if(String(input).endsWith("/expire")){expired=true;return Response.json({id:"cs_test_race",status:"expired"});}
  return Response.json({id:"cs_test_race",url:"https://checkout.stripe.com/fixture"});
 };
 try{
  await assert.rejects(createStripeCheckout(new Request("https://app.example/api/billing/checkout"),{id:"owner",plan:"free",credits:10,subscriptionStatus:"inactive",authenticated:true},{plan:"starter"},{BILLING_DB:db,STRIPE_SECRET_KEY:secret,STRIPE_WEBHOOK_SECRET:"whsec_fixture",STRIPE_PRICE_STARTER:"price_fixture",STRIPE_PRICE_PRO:"price_fixture",STRIPE_PRICE_STUDIO:"price_fixture"}),/deletion/i);
  assert.equal(expired,true);
 }finally{globalThis.fetch=original;}
});

test("late verified Stripe events trigger cancellation for deleting accounts and retry on service failure",async()=>{
 const original=globalThis.fetch;
 const db={prepare:()=>({bind(){return this;},async first(){return {...account,deleted_at:1};}})} as unknown as D1Database;
 try{
  globalThis.fetch=async()=>new Response(null,{status:503});
  await assert.rejects(guardDeletedBillingEvent(db,secret,"checkout.session.completed",{metadata:{account_id:account.id},subscription:"sub_late",customer:"cus_late"}),/paused/);
  assert.equal(await guardDeletedBillingEvent(db,secret,"customer.subscription.deleted",{id:"sub_owner"}),true);
  const unrelated={prepare:()=>({bind(){return this;},async first(){return null;}})} as unknown as D1Database;
  assert.equal(await guardDeletedBillingEvent(unrelated,secret,"checkout.session.completed",{metadata:{account_id:"other"}}),false);
 }finally{globalThis.fetch=original;}
});
