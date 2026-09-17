const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Obtener credenciales de Cloudflare R2 o S3 genérico
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const S3_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '';
const S3_BUCKET = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET || 'book-carousels';
const S3_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || process.env.S3_PUBLIC_DOMAIN || '';

let s3Client = null;

if (S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY
    }
  });
  console.log('[Storage] Cloudflare R2 / S3 configurado correctamente con endpoint:', S3_ENDPOINT);
} else {
  console.log('[Storage] Variables de Cloudflare R2 no detectadas; usando almacenamiento estático local como fallback.');
}

function isStorageConfigured() {
  return s3Client !== null;
}

/**
 * Sube un buffer (PNG, JPG, PDF) a Cloudflare R2 o almacena localmente si no está configurado
 * @param {Object} params
 * @param {Buffer} params.buffer
 * @param {string} params.key
 * @param {string} params.contentType
 * @returns {Promise<{url: string, key: string, provider: string}>}
 */
async function uploadBuffer({ buffer, key, contentType = 'image/png' }) {
  if (s3Client) {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    });

    await s3Client.send(command);

    const publicUrl = S3_PUBLIC_DOMAIN
      ? `${S3_PUBLIC_DOMAIN.replace(/\/+$/, '')}/${key}`
      : `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;

    return {
      url: publicUrl,
      key,
      provider: 'cloudflare_r2'
    };
  }

  // Fallback local: guardar en carpeta pública del microservicio
  const localDir = path.join(__dirname, '..', 'public', path.dirname(key));
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const localFilePath = path.join(__dirname, '..', 'public', key);
  fs.writeFileSync(localFilePath, buffer);

  const baseUrl = process.env.RENDERER_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
  const publicUrl = `${baseUrl.replace(/\/+$/, '')}/static/${key}`;

  return {
    url: publicUrl,
    key,
    provider: 'local_fallback'
  };
}

module.exports = {
  isStorageConfigured,
  uploadBuffer,
  S3_BUCKET
};
