const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Cloudflare R2 Uploader Serverless Function',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilice POST.' });
  }

  try {
    const {
      action = 'upload',
      imageBase64,
      fileName,
      contentType = 'image/png',
      r2Config = {}
    } = req.body || {};

    const accountId = r2Config.accountId || process.env.R2_ACCOUNT_ID;
    const accessKeyId = r2Config.accessKeyId || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = r2Config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = r2Config.bucketName || process.env.R2_BUCKET_NAME || 'book-carousels';
    const publicDomain = (r2Config.publicDomain || process.env.R2_PUBLIC_DOMAIN || '').replace(/\/+$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({
        error: 'Credenciales incompletas de Cloudflare R2 (se requiere Account ID, Access Key ID y Secret Access Key).'
      });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    // Acción 1: Test de conexión
    if (action === 'test') {
      const testKey = `tests/ping_${Date.now()}.txt`;
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: Buffer.from('Leonardo Book Carousel - Cloudflare R2 Connection Test OK'),
        ContentType: 'text/plain'
      }));

      const testUrl = publicDomain
        ? `${publicDomain}/${testKey}`
        : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${testKey}`;

      return res.status(200).json({
        success: true,
        message: '¡Conexión exitosa con Cloudflare R2!',
        bucket: bucketName,
        testUrl
      });
    }

    // Acción 2: Subir imagen de slide
    if (!imageBase64) {
      return res.status(400).json({ error: 'Se requiere imageBase64 para subir el slide.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeKey = fileName || `slides/carousel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: safeKey,
      Body: buffer,
      ContentType: contentType
    }));

    const finalUrl = publicDomain
      ? `${publicDomain}/${safeKey}`
      : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${safeKey}`;

    return res.status(200).json({
      success: true,
      url: finalUrl,
      key: safeKey,
      bucket: bucketName
    });

  } catch (err) {
    console.error('Error en /api/upload:', err);
    return res.status(500).json({
      error: err.message || 'Error al comunicarse con Cloudflare R2',
      name: err.name
    });
  }
};
