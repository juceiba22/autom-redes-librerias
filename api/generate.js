/**
 * API Serverless Endpoint: /api/generate
 * Procesa la imagen de la portada de un libro y genera la reseña editorial
 * y las 5 diapositivas del carrusel utilizando Claude (Vision)
 */

const { Anthropic } = require('@anthropic-ai/sdk');
const { verifySession } = require('../lib/session');

const CLAUDE_MODEL = 'claude-opus-5';

// Esquema JSON que Claude debe respetar (structured outputs): garantiza que la
// respuesta siempre sea un JSON válido con las 5 diapositivas.
const slideSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['cover_hook', 'quote', 'synopsis', 'highlights', 'cta'] },
    title: { type: 'string' },
    highlight: { type: 'string' },
    subtitle: { type: 'string' },
    body: { type: 'string' },
    quote: { type: 'string' },
    items: { type: 'array', items: { type: 'string' } },
    fans: { type: 'string' }
  },
  required: ['type', 'title', 'highlight', 'subtitle', 'body', 'quote', 'items', 'fans'],
  additionalProperties: false
};

const carouselSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    author: { type: 'string' },
    genre: { type: 'string' },
    publisher: { type: 'string' },
    review: { type: 'string' },
    quote: { type: 'string' },
    style: { type: 'string', enum: ['cinematic', 'editorial'] },
    palette: {
      type: 'object',
      properties: {
        primary: { type: 'string' },
        accent: { type: 'string' },
        background: { type: 'string' }
      },
      required: ['primary', 'accent', 'background'],
      additionalProperties: false
    },
    slides: { type: 'array', items: slideSchema },
    caption: { type: 'string' }
  },
  required: ['title', 'author', 'genre', 'publisher', 'review', 'quote', 'style', 'palette', 'slides', 'caption'],
  additionalProperties: false
};

function buildInstructions(storeName, storeHandle) {
  return `Genera el contenido de un carrusel de Instagram de 5 diapositivas para la librería "${storeName}" (${storeHandle}).
Los textos van sobre plantillas de diseño con tipografía grande: respeta los límites de caracteres, escribe frases cortas y con fuerza, en español rioplatense (voseo) y sin spoilers.

1. Título exacto, Autor(a), Género literario y Editorial (si no es visible, usa "").
2. review: reseña apasionada y magnética de 250 a 350 caracteres.
3. quote: una cita de la obra o frase representativa, de máx. 140 caracteres.
4. style: "cinematic" para thriller, policial, terror, fantasía, ciencia ficción, juvenil o acción; "editorial" para narrativa literaria, clásicos, ensayo, poesía, biografía y no ficción.
5. slides, en este orden exacto (usa "" o [] en los campos que no apliquen):
   - cover_hook: title = inicio del gancho sin el título del libro (máx. 35 caracteres, ej. "¿Por qué todos hablan de"); highlight = el título del libro, cerrando la pregunta si corresponde (máx. 40, ej. "La marca del psicópata?"); subtitle = máx. 50.
   - quote: quote = la misma cita del punto 3.
   - synopsis: title = titular editorial de la premisa (máx. 45, ej. "Una verdad enterrada bajo la piel."); items = exactamente 3 frases muy cortas que cuenten la premisa (máx. 45 caracteres cada una, ej. "Una tatuadora forense."); body = la premisa en un párrafo de 200 a 280 caracteres.
   - highlights: title = titular sobre por qué leerlo (máx. 30, ej. "Te va a robar el sueño"); items = exactamente 3 motivos concretos (máx. 55 caracteres cada uno); fans = "Autor A y Autor B", dos autores con lectores afines (máx. 45), o "" si no estás seguro.
   - cta: title = llamado corto (máx. 20, ej. "Disponible hoy"); body = una línea sobre disponibilidad (máx. 50, ej. "Stock físico y envíos a todo el país").
6. palette: colores hex predominantes de la tapa (primary, accent, background).
7. caption: pie de foto completo para Instagram con emojis y hashtags.

Todo el contenido debe corresponder al libro indicado; nunca uses datos de otro libro.`;
}

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
      service: 'Claude Vision Book Carousel Generator API',
      model: CLAUDE_MODEL,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilice POST.' });
  }

  try {
    const {
      imageBase64,
      bookTitle = '',
      bookAuthor = '',
      reviewText = '',
      quoteText = '',
      bookstore = {},
      apiKey = '',
      authToken
    } = req.body || {};

    // La API Key del servidor solo se usa con una sesión válida
    if (!apiKey && !verifySession(authToken)) {
      return res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
    }

    const effectiveApiKey = (apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();

    if (!effectiveApiKey) {
      return res.status(400).json({
        error: 'Se requiere una API Key de Anthropic Claude o webhook de n8n para realizar el análisis de visión.',
        guide: 'Ingresa tu ANTHROPIC_API_KEY en Ajustes (⚙️) o en las variables de entorno de tu servidor.'
      });
    }

    const storeName = (bookstore && bookstore.name) ? bookstore.name : 'Librerías Central';
    const storeHandle = (bookstore && bookstore.instagramHandle) ? bookstore.instagramHandle : '@librerias_central';
    const instructions = buildInstructions(storeName, storeHandle);

    const messagesContent = [];

    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
      const mediaType = match ? match[1] : 'image/jpeg';
      const rawBase64 = match ? match[2] : imageBase64;

      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
        return res.status(400).json({
          error: `Formato de imagen no soportado (${mediaType}). Usa JPG, PNG, GIF o WEBP.`
        });
      }

      messagesContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: rawBase64 }
      });
      messagesContent.push({
        type: 'text',
        text: `Esta es la fotografía de la portada de un libro. Identifica el libro a partir de la foto (título, autor, editorial) y luego:\n\n${instructions}`
      });
    } else {
      messagesContent.push({
        type: 'text',
        text: `Datos del libro:
Libro: ${bookTitle || 'Obra recomendada'}
Autor: ${bookAuthor || 'Autor'}
Reseña base: ${reviewText || 'Recomendación editorial'}
Cita: ${quoteText || ''}

${instructions}`
      });
    }

    const client = new Anthropic({ apiKey: effectiveApiKey });

    let response;
    try {
      response = await client.beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: carouselSchema }
        },
        system: 'Eres el redactor jefe de marketing editorial para librerías de prestigio y cuentas de Bookstagram. Escribes en español.',
        messages: [{ role: 'user', content: messagesContent }]
      });
    } catch (apiErr) {
      console.error('Error desde Claude API:', apiErr);
      if (apiErr instanceof Anthropic.AuthenticationError) {
        return res.status(401).json({ error: 'La API Key de Anthropic es inválida o fue revocada. Revísala en Ajustes (⚙️).' });
      }
      if (apiErr instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ error: 'Se alcanzó el límite de uso de Claude. Intenta de nuevo en unos segundos.' });
      }
      if (apiErr instanceof Anthropic.APIError) {
        return res.status(apiErr.status || 502).json({
          error: `Error al consultar Claude API (${apiErr.status || 'sin estado'}): ${apiErr.message}`
        });
      }
      throw apiErr;
    }

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'Claude no pudo procesar esta imagen. Prueba con otra foto de la portada.' });
    }
    if (response.stop_reason === 'max_tokens') {
      return res.status(502).json({ error: 'La respuesta de Claude quedó incompleta. Intenta generar de nuevo.' });
    }

    const textBlock = response.content.find(b => b.type === 'text');
    const rawText = textBlock ? textBlock.text : '';

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error('Error al parsear respuesta JSON de Claude:', rawText);
      return res.status(502).json({
        error: 'Claude no devolvió un JSON con el formato esperado',
        rawResponse: rawText
      });
    }

    return res.status(200).json({
      success: true,
      source: response.model || CLAUDE_MODEL,
      data: parsed
    });

  } catch (err) {
    console.error('Error en /api/generate:', err);
    return res.status(500).json({
      error: err.message || 'Error interno del servidor en generación con IA'
    });
  }
};
