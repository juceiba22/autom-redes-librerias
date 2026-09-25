/**
 * API Serverless Endpoint: /api/publish
 * Publica un carrusel en Instagram (Meta Graph API) usando las credenciales
 * del cliente guardadas en variables de entorno (META_TOKEN_<USUARIO>, IG_USER_ID_<USUARIO>).
 * Antes de llamar a Meta verifica que cada imagen sea descargable y sea JPEG.
 */

const { verifySession, getMetaCredentials, getR2Config } = require('../lib/session');

const GRAPH = 'https://graph.facebook.com/v23.0';

const sleep = ms => new Promise(r => setTimeout(r, ms));

class PublishError extends Error {
  constructor(message, status = 400, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function graphPost(path, params, accessToken) {
  const body = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (data.error) throw metaError(data.error);
  return data;
}

async function graphGet(path, params, accessToken) {
  const qs = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (data.error) throw metaError(data.error);
  return data;
}

function metaError(err) {
  let hint = '';
  if (err.code === 190) hint = 'El token de Meta expiró o fue revocado. Genera uno nuevo y actualiza la variable en Vercel.';
  else if (err.code === 10 || err.code === 200) hint = "Al token le falta el permiso 'instagram_content_publish' o no tiene acceso a esta cuenta.";
  else if (err.code === 9004 || err.error_subcode === 2207052) hint = 'Meta no pudo descargar la imagen desde la URL pública (o lo que descargó no es una imagen).';
  else if (err.code === 4 || err.code === 9 || err.code === 368) hint = 'Instagram limitó temporalmente las publicaciones. Espera unos minutos.';
  return new PublishError(
    `Meta API: ${err.error_user_msg || err.message}${hint ? `\n\n${hint}` : ''}`,
    502,
    { code: err.code, subcode: err.error_subcode, fbtrace_id: err.fbtrace_id }
  );
}

// Descarga cada URL como lo haría Meta y confirma que es una imagen JPEG accesible
async function checkImageUrl(url, idx) {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } });
  } catch (e) {
    throw new PublishError(`Slide ${idx + 1}: no se pudo acceder a ${url} (${e.message}).`);
  }
  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok) {
    throw new PublishError(
      `Slide ${idx + 1}: la URL pública respondió ${res.status}.\n${url}\n\nRevisa que el bucket de R2 tenga el acceso público activado y que R2_PUBLIC_DOMAIN sea correcto.`
    );
  }
  if (!type.startsWith('image/jpeg')) {
    throw new PublishError(
      `Slide ${idx + 1}: la URL no devuelve una imagen JPEG (content-type: "${type || 'desconocido'}").\n${url}`
    );
  }
  const size = (await res.arrayBuffer()).byteLength;
  if (size < 1000) {
    throw new PublishError(`Slide ${idx + 1}: la imagen está vacía o dañada (${size} bytes).\n${url}`);
  }
  if (size > 8 * 1024 * 1024) {
    throw new PublishError(`Slide ${idx + 1}: la imagen supera los 8 MB que acepta Instagram.`);
  }
}

async function waitForContainer(containerId, accessToken, label, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const st = await graphGet(containerId, { fields: 'status_code,status' }, accessToken);
    if (st.status_code === 'FINISHED') return;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
      throw new PublishError(`Instagram rechazó ${label}: ${st.status || st.status_code}`, 502);
    }
    await sleep(1500);
  }
  throw new PublishError(`Instagram tardó demasiado en procesar ${label}. Intenta publicar de nuevo.`, 504);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido. Utilice POST.' });

  try {
    const { authToken, imageUrls = [], caption = '', accessToken: tokenOverride, igUserId: igOverride } = req.body || {};

    const session = verifySession(authToken);
    if (!session) {
      throw new PublishError('Sesión inválida o expirada. Vuelve a iniciar sesión.', 401);
    }

    // Credenciales del cliente: variables de entorno; override manual solo para administradores
    const envCreds = getMetaCredentials(session.username);
    const useOverride = session.role === 'admin' && tokenOverride && igOverride;
    const accessToken = useOverride ? String(tokenOverride).trim() : envCreds.accessToken;
    const igUserId = useOverride ? String(igOverride).trim() : envCreds.igUserId;

    if (!accessToken || !igUserId) {
      throw new PublishError(
        `La cuenta "${session.username}" no tiene Instagram conectado.\n\nCarga en Vercel META_ACCESS_TOKEN y META_IG_USER_ID (cuenta compartida) o ${envCreds.envNames.token} y ${envCreds.envNames.igUserId} (cuenta propia), y vuelve a desplegar.`
      );
    }

    if (!Array.isArray(imageUrls) || imageUrls.length < 2 || imageUrls.length > 10) {
      throw new PublishError(`Un carrusel necesita entre 2 y 10 imágenes (recibidas: ${imageUrls.length || 0}).`);
    }

    // Solo se publican imágenes alojadas en nuestro bucket
    const { publicDomain } = getR2Config();
    if (publicDomain && !imageUrls.every(u => typeof u === 'string' && u.startsWith(publicDomain + '/'))) {
      throw new PublishError('Las imágenes deben estar alojadas en el bucket R2 configurado.');
    }

    // 1. Verificar que Meta podrá descargar cada imagen
    await Promise.all(imageUrls.map(checkImageUrl));

    // 2. Crear un contenedor por slide
    const childIds = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const item = await graphPost(`${igUserId}/media`, { image_url: imageUrls[i], is_carousel_item: 'true' }, accessToken);
      childIds.push(item.id);
    }
    await Promise.all(childIds.map((id, i) => waitForContainer(id, accessToken, `el slide ${i + 1}`)));

    // 3. Crear el contenedor del carrusel y esperar a que esté listo
    const carousel = await graphPost(`${igUserId}/media`, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption
    }, accessToken);
    await waitForContainer(carousel.id, accessToken, 'el carrusel');

    // 4. Publicar
    const published = await graphPost(`${igUserId}/media_publish`, { creation_id: carousel.id }, accessToken);

    let permalink = null;
    try {
      permalink = (await graphGet(published.id, { fields: 'permalink' }, accessToken)).permalink || null;
    } catch (e) { /* el permalink es opcional */ }

    return res.status(200).json({ success: true, id: published.id, permalink });

  } catch (err) {
    console.error('Error en /api/publish:', err);
    const status = err instanceof PublishError ? err.status : 500;
    return res.status(status).json({
      success: false,
      error: err.message || 'Error interno al publicar en Instagram',
      details: err.details || undefined
    });
  }
};
