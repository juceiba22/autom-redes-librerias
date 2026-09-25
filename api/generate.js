/**
 * API Serverless Endpoint: /api/generate
 * Procesa la imagen de la portada de un libro y genera la reseña editorial
 * y las 5 diapositivas del carrusel utilizando Claude 3.5 Sonnet (Vision)
 */

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
      apiKey = ''
    } = req.body || {};

    const effectiveApiKey = (apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();

    const storeName = (bookstore && bookstore.name) ? bookstore.name : 'Librerías Central';
    const storeHandle = (bookstore && bookstore.instagramHandle) ? bookstore.instagramHandle : '@librerias_central';

    // Si tenemos API Key de Anthropic, llamamos directamente a Claude 3.5 Sonnet (Vision)
    if (effectiveApiKey) {
      const messagesContent = [];

      if (imageBase64) {
        let mediaType = 'image/jpeg';
        let rawBase64 = imageBase64;

        const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
        if (match) {
          mediaType = match[1];
          rawBase64 = match[2];
        }

        messagesContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: rawBase64
          }
        });

        messagesContent.push({
          type: 'text',
          text: `Esta es la fotografía de un libro para nuestra librería "${storeName}" (${storeHandle}).
Por favor:
1. Identifica el Título exacto, Autor(a), Género literario y Editorial (si es visible).
2. Redacta una reseña literaria apasionada, magnética y sin spoilers de 250 a 350 caracteres para Bookstagram.
3. Extrae o formula una cita célebre o frase representativa e inolvidable de la obra.
4. Genera el contenido para las 5 diapositivas del carrusel de Instagram (proporción 4:5):
   - Slide 1 (cover_hook): categoría, título gancho ("¿POR QUÉ TODOS ESTÁN LEYENDO...?"), subtítulo.
   - Slide 2 (quote): categoría "CITA INOLVIDABLE", título "LA VOZ DEL AUTOR", quote (la cita), subtítulo.
   - Slide 3 (synopsis): categoría "LA PREMISA", título "EL CORAZÓN DEL RELATO", body (síntesis argumental).
   - Slide 4 (highlights): categoría "VEREDICTO LIBRERO", título "¿POR QUÉ DEBES LEERLO?", body (por qué apasiona a los lectores y a quién se recomienda).
   - Slide 5 (cta): categoría "DISPONIBILIDAD", título "DISPONIBLE EN TIENDA", body (invitación a visitar ${storeName} o pedir por DM con ${storeHandle}).
5. Extrae una paleta armónica basada en los colores predominantes de la tapa (colores hex: primary, accent, background).
6. Redacta el pie de foto (caption) completo para Instagram con emojis y hashtags.

IMPORTANTE: Responde ÚNICAMENTE con un JSON con la siguiente estructura exacta:
{
  "title": "string",
  "author": "string",
  "genre": "string",
  "publisher": "string",
  "review": "string",
  "quote": "string",
  "palette": {
    "primary": "#hex",
    "accent": "#hex",
    "background": "#hex"
  },
  "slides": [
    {"type": "cover_hook", "category": "RECOMENDACIÓN EDITORIAL", "title": "string", "subtitle": "string", "body": ""},
    {"type": "quote", "category": "CITA INOLVIDABLE", "title": "LA VOZ DEL AUTOR", "subtitle": "string", "quote": "string"},
    {"type": "synopsis", "category": "LA PREMISA", "title": "EL CORAZÓN DEL RELATO", "subtitle": "string", "body": "string"},
    {"type": "highlights", "category": "VEREDICTO LIBRERO", "title": "¿POR QUÉ DEBES LEERLO HOY?", "subtitle": "string", "body": "string"},
    {"type": "cta", "category": "DISPONIBILIDAD", "title": "EN TODAS NUESTRAS SUCURSALES", "subtitle": "string", "body": "string"}
  ],
  "caption": "string"
}`
        });
      } else {
        // Generación por texto cuando no hay foto
        messagesContent.push({
          type: 'text',
          text: `Genera el carrusel de Instagram para la librería "${storeName}" (${storeHandle}) con estos datos:
Libro: ${bookTitle || 'Obra recomendada'}
Autor: ${bookAuthor || 'Autor'}
Reseña base: ${reviewText || 'Recomendación editorial'}
Cita: ${quoteText || ''}

Genera la respuesta en el mismo formato JSON estricto especificado.`
        });
      }

      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': effectiveApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          system: 'Eres el redactor jefe de marketing editorial para librerías de prestigio y cuentas de Bookstagram. Respondes ÚNICA Y EXCLUSIVAMENTE con un JSON válido sin texto previo ni posterior, sin comillas de markdown.',
          messages: [
            {
              role: 'user',
              content: messagesContent
            }
          ]
        })
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.error('Error desde Claude API:', errorText);
        return res.status(claudeResponse.status).json({
          error: `Error al consultar Claude API (${claudeResponse.status}): ${errorText}`
        });
      }

      const claudeData = await claudeResponse.json();
      const rawText = claudeData.content && claudeData.content[0] ? claudeData.content[0].text : '';
      const cleanJsonText = rawText.replace(/```json\n?|```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJsonText);
        return res.status(200).json({
          success: true,
          source: 'claude-3-5-sonnet',
          data: parsed
        });
      } catch (jsonErr) {
        console.error('Error al parsear respuesta JSON de Claude:', cleanJsonText);
        return res.status(500).json({
          error: 'Claude no devolvió un JSON con el formato esperado',
          rawResponse: rawText
        });
      }
    }

    // Si no hay API key configurada, informamos con un mensaje claro y guiado
    return res.status(400).json({
      error: 'Se requiere una API Key de Anthropic Claude o webhook de n8n para realizar el análisis de visión.',
      guide: 'Ingresa tu ANTHROPIC_API_KEY en Ajustes (⚙️) o en las variables de entorno de tu servidor.'
    });

  } catch (err) {
    console.error('Error en /api/generate:', err);
    return res.status(500).json({
      error: err.message || 'Error interno del servidor en generación con IA'
    });
  }
};
