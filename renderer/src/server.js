const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { renderSlide, renderCarousel } = require('./renderer');
const { extractBookPalette } = require('./colorExtractor');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Healthcheck para Railway
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'book-carousel-renderer',
    timestamp: new Date().toISOString()
  });
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
    const { svg, base64, pngBuffer } = await renderSlide(slideConfig);

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
      base64,
      svg
    });
  } catch (error) {
    console.error('Error en /api/render-slide:', error);
    res.status(500).json({ error: error.message });
  }
});

// Renderizar un carrusel completo (5-7 diapositivas)
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
      <title>Test - Book Carousel Renderer</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0f172a; color: white; padding: 40px; }
        .card { background: #1e293b; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; }
        button { background: #ea580c; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Book Carousel Renderer API</h2>
        <p>Microservicio activo y listo para renderizar plantillas de carruseles.</p>
        <p>Endpoint de salud: <code>GET /health</code></p>
        <p>Endpoint de render: <code>POST /api/render-carousel</code></p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`[Renderer] Microservicio iniciado en http://localhost:${PORT}`);
});
