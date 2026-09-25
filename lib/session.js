/**
 * Sesiones firmadas (HMAC-SHA256) y lectura de credenciales por cliente
 * desde variables de entorno de Vercel.
 *
 * Variables de entorno:
 *   AUTH_SECRET                  -> clave para firmar sesiones (obligatoria)
 *   ANTHROPIC_API_KEY            -> global, para /api/generate
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_DOMAIN -> globales, para /api/upload
 *   META_ACCESS_TOKEN, META_IG_USER_ID -> cuenta de Instagram compartida por todos
 *   META_TOKEN_<USUARIO>, IG_USER_ID_<USUARIO> -> (opcional) cuenta propia de un cliente,
 *                                   tiene prioridad sobre la compartida
 */

const crypto = require('crypto');

const SESSION_DAYS = 30;

function getSecret() {
  return (process.env.AUTH_SECRET || '').trim();
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function hmac(data) {
  return b64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
}

// Devuelve null si AUTH_SECRET no está configurado
function signSession(user) {
  if (!getSecret()) return null;
  const payload = b64url(JSON.stringify({
    u: user.username,
    r: user.role || 'client',
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  }));
  return `${payload}.${hmac(payload)}`;
}

// Devuelve { username, role } o null si el token es inválido o expiró
function verifySession(token) {
  if (!token || typeof token !== 'string' || !getSecret()) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!data.u || !data.exp || data.exp < Date.now()) return null;
    return { username: data.u, role: data.r || 'client' };
  } catch (e) {
    return null;
  }
}

// "libreria-rayuela" -> "LIBRERIA_RAYUELA"
function envSuffix(username) {
  return String(username || '').toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function getMetaCredentials(username) {
  const suffix = envSuffix(username);
  const ownToken = (process.env[`META_TOKEN_${suffix}`] || '').trim();
  const ownIgId = (process.env[`IG_USER_ID_${suffix}`] || '').trim();
  const hasOwn = Boolean(ownToken && ownIgId);
  return {
    accessToken: hasOwn ? ownToken : (process.env.META_ACCESS_TOKEN || '').trim(),
    igUserId: hasOwn ? ownIgId : (process.env.META_IG_USER_ID || '').trim(),
    envNames: { token: `META_TOKEN_${suffix}`, igUserId: `IG_USER_ID_${suffix}` }
  };
}

function normalizePublicDomain(domain) {
  let d = String(domain || '').trim().replace(/\/+$/, '');
  if (d && !/^https?:\/\//i.test(d)) d = `https://${d}`;
  return d;
}

function getR2Config(override = {}) {
  const rawAccountId = (override.accountId || process.env.R2_ACCOUNT_ID || '').trim();
  return {
    accountId: rawAccountId
      .replace(/^https?:\/\//i, '')
      .replace(/\.r2\.cloudflarestorage\.com.*$/i, '')
      .replace(/\/+$/, ''),
    accessKeyId: (override.accessKeyId || process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (override.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    bucketName: (override.bucketName || process.env.R2_BUCKET_NAME || 'book-carousels').trim(),
    publicDomain: normalizePublicDomain(override.publicDomain || process.env.R2_PUBLIC_DOMAIN || '')
  };
}

// Resumen de qué está configurado en el servidor para un usuario (sin exponer secretos)
function getConnectionStatus(username) {
  const r2 = getR2Config();
  const meta = getMetaCredentials(username);
  return {
    authSecret: Boolean(getSecret()),
    ai: Boolean((process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim()),
    storage: Boolean(r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.publicDomain),
    instagram: Boolean(meta.accessToken && meta.igUserId),
    envNames: meta.envNames
  };
}

module.exports = {
  signSession,
  verifySession,
  getMetaCredentials,
  getR2Config,
  normalizePublicDomain,
  getConnectionStatus
};
