export function authServiceUnavailable(error) {
  const code = String(error.code || '');
  return (
    /^(?:[0-9A-Z]{5}$|E(?:CONN|HOST|NET|PIPE|TIMEDOUT)|ERR_JWKS_TIMEOUT)/.test(code) ||
    /connect|database|timeout/i.test(error.message || '')
  );
}
