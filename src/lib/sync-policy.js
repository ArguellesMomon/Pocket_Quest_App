// Only definite server rejections may discard an operation ID. Transport failures
// can happen after commit, so retries must reuse the same ID.
export function retryableSyncError(error) {
  return !error.status || [401, 408, 429].includes(error.status) || error.status >= 500;
}
export function retryDelay(attempt) {
  return Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
}
