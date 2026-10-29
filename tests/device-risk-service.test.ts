import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRiskOwner,recordDevice,listRiskObservations,type DeviceRiskEnv} from '../src/lib/device-risk-service';
import type {D1Database,D1Statement} from '../src/lib/billing-db';

function fakeDb() {
  const calls: {sql:string; values:unknown[]}[] = [];
  const db = {prepare(sql:string){const item={sql,values:[] as unknown[]};calls.push(item);const statement={bind(...values:unknown[]){item.values=values;return statement},async all(){return {results:[],meta:{changes:0}}},async first(){return null},async run(){return {meta:{changes:0}}}};return statement as D1Statement},async batch(){return []}} as D1Database;
  return {db,calls};
}
const owner={id:'owner-id',email:'owner@example.com'};
test('disabled configuration collects nothing and exposes no records', async()=>{
  const {db,calls}=fakeDb(), env={BILLING_DB:db};
  assert.deepEqual(await recordDevice(env,owner,{version:1}),{recorded:false});
  assert.equal(await listRiskObservations(env,owner),null); assert.equal(calls.length,0);
});
test('only a verified user matching configured owner may read',()=>{
  const {db}=fakeDb();const env:DeviceRiskEnv={DEVICE_RISK_ENABLED:'true',DEVICE_RISK_HMAC_SECRET:'x'.repeat(32),DEVICE_RISK_OWNER_EMAIL:'OWNER@example.com',BILLING_DB:db};
  assert.equal(isRiskOwner(env,null),false); assert.equal(isRiskOwner(env,{id:'other',email:'other@example.com'}),false);assert.equal(isRiskOwner(env,owner),true);
});
test('stored record contains protected hashes rather than raw signals',async()=>{
  const {db,calls}=fakeDb();const env:DeviceRiskEnv={DEVICE_RISK_ENABLED:'true',DEVICE_RISK_HMAC_SECRET:'x'.repeat(32),DEVICE_RISK_OWNER_EMAIL:'owner@example.com',BILLING_DB:db};
  await recordDevice(env,owner,{version:1,deviceId:'secret-device-id'},10000000000);
  const stored=String(calls.find(c=>c.sql.includes('INSERT OR IGNORE'))?.values[2]);
  assert.ok(stored.includes('deviceId'));assert.ok(!stored.includes('secret-device-id'));assert.ok(calls.some(c=>c.sql.includes('DELETE')));
});
test('invalid data fails before database use',async()=>{
  const {db,calls}=fakeDb();const env:DeviceRiskEnv={DEVICE_RISK_ENABLED:'true',DEVICE_RISK_HMAC_SECRET:'x'.repeat(32),DEVICE_RISK_OWNER_EMAIL:'owner@example.com',BILLING_DB:db};
  await assert.rejects(recordDevice(env,owner,{version:1,unexpected:'x'}));assert.equal(calls.length,0);
});
