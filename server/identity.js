import { createRemoteJWKSet, jwtVerify } from 'jose';
import { database } from './database.js';
import { authServiceUnavailable } from './auth-errors.js';
let keys, keyUrl;
export async function requireIdentity(req) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw Object.assign(new Error('Please sign in to continue.'), { status: 401 });
  try {
    const url = process.env.NEON_AUTH_JWKS_URL;
    if (!url) throw new Error('Missing JWKS.');
    if (url !== keyUrl) {
      keys = createRemoteJWKSet(new URL(url));
      keyUrl = url;
    }
    const origin = new URL(process.env.NEON_AUTH_BASE_URL).origin;
    const { payload } = await jwtVerify(token, keys, {
      issuer: origin,
      audience: origin,
      algorithms: ['EdDSA'],
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    if (payload.role !== 'authenticated' || payload.banned || !payload.sub)
      throw new Error('Invalid identity.');
    const { rows } = await database().query(
      'select id,name,banned,"banExpires" from neon_auth."user" where id=$1',
      [payload.sub],
    );
    if (
      !rows.length ||
      (rows[0].banned && (!rows[0].banExpires || new Date(rows[0].banExpires) > new Date()))
    )
      throw new Error('Inactive account.');
    return { owner: payload.sub, name: rows[0].name };
  } catch (error) {
    if (authServiceUnavailable(error))
      throw Object.assign(
        new Error('The account service is temporarily unavailable. Please try again.'),
        { status: 503 },
      );
    throw Object.assign(new Error('Your session has ended. Please sign in again.'), {
      status: 401,
    });
  }
}
