import test from 'node:test';
import assert from 'node:assert/strict';
import { retryableSyncError, retryDelay } from '../src/lib/sync-policy.js';
test('uncertain outcomes retain their operation ID; definite rejections can be discarded', () => {
  for (const status of [undefined, 401, 408, 429, 500, 502, 503, 504])
    assert.equal(retryableSyncError({ status }), true, String(status));
  for (const status of [400, 403, 404, 409, 413, 422])
    assert.equal(retryableSyncError({ status }), false, String(status));
});
test('background retries back off to a bounded interval', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 20].map(retryDelay),
    [1000, 2000, 4000, 8000, 16000, 30000, 30000],
  );
});
