const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { renderSlide, renderCarousel } = require('./renderer');
const { extractBookPalette } = require('./colorExtractor');
const { isStorageConfigured, uploadBuffer, S3_BUCKET } = require('./storage');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos locales de respaldo
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// Healthcheck para Railway
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'book-carousel-renderer',
    storageProvider: isStorageConfigured() ? 'Cloudflare R2' : 'Local Fallback',
    bucket: S3_BUCKET,
    timestamp: new Date().toISOString()
  });
});

// Subir un medio (portada, PDF o imagen) a Cloudflare R2
app.post('/api/upload-media', async (req, res) => {
  try {
    const { fileBase64, filename = 'upload.png', contentType = 'image/png' } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'Se requiere fileBase64' });
    }

    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `uploads/${Date.now()}_${safeFilename}`;

    const uploadRes = await uploadBuffer({ buffer, key, contentType });
    res.json({
      success: true,
      url: uploadRes.url,
      key: uploadRes.key,
      provider: uploadRes.provider
    });
  } catch (error) {
    console.error('Error en /api/upload-media:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extraer paleta de colores de una imagen
app.post('/api/extract-palette', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Se requiere imageBase64' });
    }
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const palette = await extractBookPalette(buffer);
    res.json({ success: true, palette });
  } catch (error) {
    console.error('Error en /api/extract-palette:', error);
    res.status(500).json({ error: error.message });
  }
});

// Renderizar una única diapositiva
app.post('/api/render-slide', async (req, res) => {
  try {
    const slideConfig = req.body;
    const { svg, base64, pngBuffer, imageUrl } = await renderSlide(slideConfig);

    if (req.query.format === 'png') {
      res.setHeader('Content-Type', 'image/png');
      return res.send(pngBuffer);
    }

    if (req.query.format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    res.json({
      success: true,
      slideNumber: slideConfig.slideNumber || 1,
      imageUrl,
      base64,
      svg
    });
  } catch (error) {
    console.error('Error en /api/render-slide:', error);
    res.status(500).json({ error: error.message });
  }
});

// Renderizar un carrusel completo (5-7 diapositivas) y subir a R2
app.post('/api/render-carousel', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.slides || !payload.slides.length) {
      return res.status(400).json({ error: 'Se requiere un arreglo de slides' });
    }

    const result = await renderCarousel(payload);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error en /api/render-carousel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vista previa HTML interactiva para pruebas rápidas
app.get('/preview', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Leonardo - Renderer Microservice & Storage</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #FAF7F2; color: #1B1C15; padding: 40px; }
        .card { background: white; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #DDDCD1; }
        code { background: #F5F4E8; padding: 2px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Leonardo Carousel Renderer API</h2>
        <p>Microservicio activo con soporte para Cloudflare R2 Storage.</p>
        <p>Healthcheck: <code>GET /health</code></p>
        <p>Subir archivos a R2: <code>POST /api/upload-media</code></p>
        <p>Renderizar carrusel: <code>POST /api/render-carousel</code></p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`[Renderer] Microservicio iniciado en http://localhost:${PORT}`);
});
