const sharp = require('sharp');
const { buildSlideSvg } = require('./templates');
const { extractBookPalette } = require('./colorExtractor');
const { uploadBuffer } = require('./storage');

/**
 * Renderiza una diapositiva individual a PNG de alta resolución (1080x1350)
 * @param {Object} options Configuración de la diapositiva y marca
 * @returns {Promise<{svg: string, pngBuffer: Buffer, base64: string, imageUrl?: string}>}
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

  let imageUrl = null;
  if (options.uploadToStorage) {
    const key = `slides/${options.carouselId || Date.now()}/slide_${options.slideNumber || 1}.png`;
    const uploadRes = await uploadBuffer({ buffer: pngBuffer, key, contentType: 'image/png' });
    imageUrl = uploadRes.url;
  }

  return {
    svg,
    pngBuffer,
    base64,
    imageUrl
  };
}

/**
 * Renderiza todas las diapositivas de un carrusel completo y las sube a Cloudflare R2 / S3
 * @param {Object} payload Datos del libro, diapositivas y librería
 * @returns {Promise<Object>}
 */
async function renderCarousel(payload) {
  const {
    book = {},
    slides = [],
    bookstore = {},
    theme = 'editorial_classic',
    aspectRatio = '4:5',
    carouselId = `carousel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  } = payload;

  const width = 1080;
  const height = aspectRatio === '1:1' ? 1080 : 1350;

  // Extraer paleta o usar fallback
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
      primary: bookstore.brandPrimaryColor || '#5c091c',
      accent: bookstore.brandAccentColor || '#C29B38',
      background: '#FAF7F2',
      surface: '#FFFFFF',
      text: '#1B1C15',
      mutedText: '#858679',
      isDark: false
    };
  }

  const totalSlides = slides.length;
  const results = [];
  const slideImageUrls = [];

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
      bookstoreName: bookstore.name || 'Librerías Central',
      instagramHandle: bookstore.instagramHandle || '@librerias_central',
      palette,
      theme,
      width,
      height,
      carouselId,
      uploadToStorage: true
    });

    results.push({
      slideNumber,
      slideType: slide.type,
      title: slide.title,
      imageUrl: rendered.imageUrl,
      base64: rendered.base64,
      svg: rendered.svg
    });

    if (rendered.imageUrl) {
      slideImageUrls.push(rendered.imageUrl);
    }
  }

  return {
    carouselId,
    palette,
    aspectRatio,
    totalSlides,
    slides: results,
    slideImageUrls
  };
}

module.exports = {
  renderSlide,
  renderCarousel
};
