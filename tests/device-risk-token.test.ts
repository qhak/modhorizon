import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDeviceRiskToken,verifyDeviceRiskToken} from '../src/lib/device-risk-token';
import type {D1Database} from '../src/lib/billing-db';
const env={DEVICE_RISK_ENABLED:'true',DEVICE_RISK_HMAC_SECRET:'a'.repeat(32),DEVICE_RISK_OWNER_EMAIL:'owner@example.com',BILLING_DB:{} as D1Database};
const owner={id:'owner-id',email:'owner@example.com'};
test('only owner gets a token, and it expires',async()=>{
  assert.equal(await createDeviceRiskToken(env,{id:'other',email:'other@example.com'},1000),null);
  const token=await createDeviceRiskToken(env,owner,1000); assert.ok(token);
  assert.deepEqual(await verifyDeviceRiskToken(env,token,1001),owner);
  assert.equal(await verifyDeviceRiskToken(env,token,301001),null);
});
test('altered tokens and changed owner configuration are rejected',async()=>{
  const token=await createDeviceRiskToken(env,owner,1000); assert.ok(token);
  assert.equal(await verifyDeviceRiskToken(env,token.slice(0,-1)+(token.endsWith('a')?'b':'a'),1001),null);
  assert.equal(await verifyDeviceRiskToken({...env,DEVICE_RISK_OWNER_EMAIL:'new@example.com'},token,1001),null);
});
