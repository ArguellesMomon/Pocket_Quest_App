import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla/adapters';
export const cloudConfigured = Boolean(import.meta.env.VITE_NEON_AUTH_URL);
export const auth = cloudConfigured
  ? createAuthClient(`${location.origin}/api/auth`, {
      adapter: BetterAuthVanillaAdapter({ fetchOptions: { credentials: 'include' } }),
    })
  : null;
let cachedToken = null,
  tokenExpiresAt = 0,
  tokenRequest = null,
  generation = 0;
export function clearTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
  tokenRequest = null;
  generation++;
}
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  if (tokenRequest) return tokenRequest;
  const requestGeneration = generation;
  const request = fetchToken()
    .then((token) => {
      if (generation !== requestGeneration) {
        const error = new Error('Please sign in again.');
        error.status = 401;
        throw error;
      }
      try {
        const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(raw));
        tokenExpiresAt = Number(payload.exp) * 1000 - 60000;
        cachedToken = token;
      } catch {
        tokenExpiresAt = 0;
      }
      return token;
    })
    .finally(() => {
      if (tokenRequest === request) tokenRequest = null;
    });
  tokenRequest = request;
  return request;
}
async function fetchToken() {
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
  return tokenData.token;
}
export async function cloudRequest(action, renewed = false, expectedOwner) {
  const token = await getToken();
  if (expectedOwner) {
    let subject;
    try {
      subject = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    } catch {}
    if (subject !== expectedOwner) {
      clearTokenCache();
      const error = new Error('Please sign in again to sync this adventure.');
      error.status = 401;
      throw error;
    }
  }
  const response = await fetch('/api/game', {
    method: action ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: action ? JSON.stringify(action) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (response.status === 401 && !renewed) {
    clearTokenCache();
    return cloudRequest(action, true, expectedOwner);
  }
  if (!response.ok) {
    const error = new Error(result.error || 'Could not sync your adventure.');
    error.status = response.status;
    throw error;
  }
  return result;
}
