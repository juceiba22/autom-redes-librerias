const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { verifySession, getR2Config } = require('../lib/session');

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
      contentType = 'image/jpeg',
      r2Config = {},
      authToken
    } = req.body || {};

    // Las credenciales del servidor solo se usan con una sesión válida
    const hasOverride = Boolean(r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey);
    if (!hasOverride && !verifySession(authToken)) {
      return res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
    }

    const { accountId: cleanAccountId, accessKeyId, secretAccessKey, bucketName, publicDomain } =
      getR2Config(hasOverride ? r2Config : {});

    if (!cleanAccountId || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({
        error: 'Credenciales incompletas de Cloudflare R2 (se requiere Account ID, Access Key ID y Secret Access Key).'
      });
    }

    const endpoint = `https://${cleanAccountId}.r2.cloudflarestorage.com`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
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
        : `${endpoint}/${bucketName}/${testKey}`;

      // Verificar que el archivo sea descargable públicamente (Instagram lo necesita)
      if (!publicDomain) {
        return res.status(200).json({
          success: false,
          error: 'Credenciales OK, pero falta el dominio público del bucket: Instagram no podrá descargar las imágenes.'
        });
      }
      try {
        const pub = await fetch(testUrl);
        if (!pub.ok) {
          return res.status(200).json({
            success: false,
            error: `Credenciales OK, pero el dominio público responde ${pub.status} en ${testUrl}. Activa el acceso público del bucket en Cloudflare.`
          });
        }
      } catch (e) {
        return res.status(200).json({
          success: false,
          error: `Credenciales OK, pero no se pudo acceder al dominio público (${e.message}).`
        });
      }

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
    const safeKey = fileName || `slides/carousel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: safeKey,
      Body: buffer,
      ContentType: contentType
    }));

    if (!publicDomain) {
      return res.status(400).json({
        error: 'Falta el dominio público del bucket (R2_PUBLIC_DOMAIN). Sin él, Instagram no puede descargar las imágenes.'
      });
    }
    const finalUrl = `${publicDomain}/${safeKey}`;

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
