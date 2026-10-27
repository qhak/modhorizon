import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { confirmedAccountUser, resolveAccountAppOrigin, safeAccountReturn, validPassword } from "../src/lib/account-auth-policy";
import { resolveAccountIdentity, authorizedBillingAccountId } from "../src/lib/account-identity";
import type { D1Database, D1Statement } from "../src/lib/billing-db";

test("private preview sign-in stays local despite hosted Cloudflare bindings", () => {
  const live = "https://modhorizon.callout-ai.workers.dev";
  const local = "http://127.0.0.1:3215";
  assert.equal(resolveAccountAppOrigin(`${local}/api/auth/action`, live, local, true), local);
  assert.equal(resolveAccountAppOrigin(`${local}/auth/callback`, live, local, true), local);
  assert.equal(resolveAccountAppOrigin("http://localhost:3215/auth/callback", live, local, true, "127.0.0.1:3215"), local);
  assert.equal(resolveAccountAppOrigin("http://localhost:3215/auth/callback", live, local, true, "evil.example"), live);
  assert.equal(resolveAccountAppOrigin(`${local}/auth/callback`, live, "https://evil.example", true, "evil.example"), live);
  assert.equal(resolveAccountAppOrigin(`${local}/auth/callback`, live, local, false), live);
  assert.equal(resolveAccountAppOrigin("https://evil.example/auth/callback", live, local, true), live);
  assert.equal(resolveAccountAppOrigin("http://127.0.0.1:9999/auth/callback", live, local, true), live);
  assert.equal(resolveAccountAppOrigin(`${live}/auth/callback`, live, local, true), live);
});

test("authorization requires a confirmed, non-anonymous identity",()=>{
  assert.equal(confirmedAccountUser(null),null);
  assert.equal(confirmedAccountUser({id:"a",email:"a@example.com"}),null);
  assert.equal(confirmedAccountUser({id:"a",email:"a@example.com",email_confirmed_at:"today",is_anonymous:true}),null);
  assert.deepEqual(confirmedAccountUser({id:"a",email:"a@example.com",email_confirmed_at:"today"}),{id:"a",email:"a@example.com"});
});
test("account destinations cannot redirect outside the application",()=>{
  for(const value of ["https://evil.example","//evil.example","/\\evil.example","/pricing?next=evil",null])assert.equal(safeAccountReturn(value),"/account");
  assert.equal(safeAccountReturn("/pricing"),"/pricing");
  assert.equal(validPassword("short"),false);
  assert.equal(validPassword("a".repeat(129)),false);
  assert.equal(validPassword("long enough password"),true);
});
test("verified identity claims a guest once, recovers its existing account, and cannot merge owners",async()=>{
  const sqlite=new DatabaseSync(":memory:");
  try {
    for(const name of ["0001_billing.sql","0002_generation_reservations.sql","0003_credit_buckets.sql","0004_account_identity.sql","0005_scheduled_cancellation.sql","0006_community.sql","0007_moderation_and_deletion.sql","0008_deletion_activity_guard.sql","0009_rewarded_ads.sql"])sqlite.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),"utf8"));
    sqlite.exec("INSERT INTO billing_accounts(id,credit_balance,created_at,updated_at) VALUES('guest',50,0,0),('second',70,0,0)");
    function statement(query:string,values:SQLInputValue[]=[]):D1Statement {
      return {bind:(...args)=>statement(query,args as SQLInputValue[]),first:async<T>()=>(sqlite.prepare(query).get(...values)??null) as T|null,
        all:async<T>()=>({results:sqlite.prepare(query).all(...values) as T[],meta:{changes:0}}),run:async()=>({meta:{changes:Number(sqlite.prepare(query).run(...values).changes)}})};
    }
    const db:D1Database={prepare:statement,batch:async()=>[]};
    const user={id:"verified-a",email:"a@example.com"};
    assert.equal(await resolveAccountIdentity(db,user,"guest"),"guest");
    assert.equal(await resolveAccountIdentity(db,user,"second"),"guest");
    assert.equal(await resolveAccountIdentity(db,{id:"verified-b",email:"b@example.com"},"guest"),null);
    assert.equal(await resolveAccountIdentity(db,{id:"verified-b",email:"b@example.com"},null),null);
    assert.equal(sqlite.prepare("SELECT credit_balance FROM billing_accounts WHERE id='guest'").get()!.credit_balance,50);
    assert.equal(sqlite.prepare("SELECT credit_balance FROM billing_accounts WHERE id='second'").get()!.credit_balance,70);
    assert.equal(sqlite.prepare("SELECT auth_subject FROM billing_accounts WHERE id='second'").get()!.auth_subject,null);
    assert.equal(await resolveAccountIdentity(db,user,null),"guest");
    const owned={id:"guest",auth_subject:user.id};
    assert.equal(await authorizedBillingAccountId(db,null,owned),null,"old or stolen guest cookie cannot authorize a claimed account");
    assert.equal(await authorizedBillingAccountId(db,null,{id:"guest",auth_subject:null}),null,"stale unclaimed row is rechecked after concurrent claim");
    assert.equal(await authorizedBillingAccountId(db,{id:"verified-b",email:"b@example.com"},owned),null,"different subject cannot take account through its cookie");
    assert.equal(await authorizedBillingAccountId(db,user,null),"guest","owner can recover from a new device without a billing cookie");
    assert.equal(await authorizedBillingAccountId(db,null,{id:"second",auth_subject:null}),"second","unclaimed guest account still works");
  } finally {sqlite.close();}
});
