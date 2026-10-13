import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla/adapters';
export const cloudConfigured = Boolean(import.meta.env.VITE_NEON_AUTH_URL);
export const auth = cloudConfigured
  ? createAuthClient(`${location.origin}/api/auth`, {
      adapter: BetterAuthVanillaAdapter({ fetchOptions: { credentials: 'include' } }),
    })
  : null;
export async function cloudRequest(action) {
  // The managed SDK's route cache can return get-session data for token().
  // Use the same-origin token endpoint so authentication never depends on that cache.
  const tokenResponse = await fetch('/api/auth/token', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    const error = new Error(
      tokenResponse.status >= 500
        ? 'The account service is temporarily unavailable.'
        : 'Please sign in again to sync your adventure.',
    );
    error.status = tokenResponse.status;
    throw error;
  }
  if (!tokenData?.token) {
    const error = new Error('Please sign in again to sync your adventure.');
    error.status = 401;
    throw error;
  }
  const response = await fetch('/api/game', {
    method: action ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${tokenData.token}`, 'Content-Type': 'application/json' },
    body: action ? JSON.stringify(action) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Could not sync your adventure.');
    error.status = response.status;
    throw error;
  }
  return result;
}
