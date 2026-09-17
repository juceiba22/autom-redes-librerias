const sharp = require('sharp');
const { buildSlideSvg } = require('./templates');
const { extractBookPalette } = require('./colorExtractor');

/**
 * Renderiza una diapositiva individual a PNG de alta resolución (1080x1350)
 * @param {Object} options Configuración de la diapositiva y marca
 * @returns {Promise<{svg: string, pngBuffer: Buffer, base64: string}>}
 */
async function renderSlide(options) {
  const svg = buildSlideSvg(options);
  
  // Convertir SVG a PNG de ultra-alta fidelidad usando sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({
      quality: 95,
      compressionLevel: 8
    })
    .toBuffer();

  const base64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  return {
    svg,
    pngBuffer,
    base64
  };
}

/**
 * Renderiza todas las diapositivas de un carrusel completo
 * @param {Object} payload Datos del libro, diapositivas y librería
 * @returns {Promise<Array<Object>>}
 */
async function renderCarousel(payload) {
  const {
    book = {},
    slides = [],
    bookstore = {},
    theme = 'editorial_classic',
    aspectRatio = '4:5'
  } = payload;

  const width = 1080;
  const height = aspectRatio === '1:1' ? 1080 : 1350;

  // Si no se proporcionó paleta, extraerla de la portada del libro o usar fallback
  let palette = payload.palette;
  if (!palette && book.coverImageUrl) {
    try {
      if (book.coverImageUrl.startsWith('data:image')) {
        const base64Data = book.coverImageUrl.split(',')[1];
        palette = await extractBookPalette(Buffer.from(base64Data, 'base64'));
      }
    } catch (e) {
      console.warn('No se pudo extraer paleta de la portada, usando paleta por defecto:', e.message);
    }
  }

  if (!palette) {
    palette = {
      primary: bookstore.brandPrimaryColor || '#1E293B',
      accent: bookstore.brandAccentColor || '#C2410C',
      background: '#FDFBF7',
      surface: '#FFFFFF',
      text: '#0F172A',
      mutedText: '#64748B',
      isDark: false
    };
  }

  const totalSlides = slides.length;
  const results = [];

  for (let i = 0; i < totalSlides; i++) {
    const slide = slides[i];
    const slideNumber = i + 1;

    const rendered = await renderSlide({
      slideNumber,
      totalSlides,
      slideType: slide.type || (slideNumber === 1 ? 'cover_hook' : slideNumber === totalSlides ? 'cta' : 'synopsis'),
      title: slide.title || slide.headline || '',
      subtitle: slide.subtitle || slide.subheadline || '',
      bodyText: slide.body || slide.bodyText || '',
      quoteText: slide.quote || slide.text || '',
      bookTitle: book.title || 'Título del Libro',
      bookAuthor: book.author || 'Autor',
      coverImageUrl: book.coverImageUrl || '',
      bookstoreName: bookstore.name || 'Librería',
      instagramHandle: bookstore.instagramHandle || '@libreria',
      palette,
      theme,
      width,
      height
    });

    results.push({
      slideNumber,
      slideType: slide.type,
      title: slide.title,
      base64: rendered.base64,
      svg: rendered.svg
    });
  }

  return {
    palette,
    aspectRatio,
    totalSlides,
    slides: results
  };
}

module.exports = {
  renderSlide,
  renderCarousel
};
