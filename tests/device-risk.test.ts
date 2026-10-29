import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSignals } from '../src/lib/device-risk/validate.mjs';
import { protectSignals, compareSignals } from '../src/lib/device-risk/matcher.mjs';

test('invalid data is rejected and missing signals do not match', async () => {
  assert.equal(validateSignals({ version: 1, arbitrary: 'payload' }), false);
  const key = 'a'.repeat(32);
  const record = await protectSignals({ version: 1 }, key);
  assert.equal(compareSignals(record, record).score, 0);
});
test('a device match is a review signal, not proof of fraud', async () => {
  const record = await protectSignals({ version: 1, deviceId: 'test-device', canvas: 'a'.repeat(64) }, 'b'.repeat(32));
  const result = compareSignals(record, record);
  assert.equal(result.action, 'review');
  assert.deepEqual(result.matches, ['deviceId', 'canvas']);
});
