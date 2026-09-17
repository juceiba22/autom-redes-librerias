const sharp = require('sharp');

/**
 * Convierte valores RGB a Hexadecimal (#RRGGBB)
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calcula la luminancia relativa perceptiva según WCAG
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula saturación simple HSV
 */
function getSaturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Extrae la paleta cromática clave de la portada de un libro
 * @param {Buffer|string} imageInput - Buffer de imagen o ruta
 * @returns {Promise<{primary: string, secondary: string, accent: string, background: string, text: string}>}
 */
async function extractBookPalette(imageInput) {
  try {
    // Redimensionar a miniatura pequeña para muestreo rápido de color
    const { data, info } = await sharp(imageInput)
      .resize(48, 48, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = data.length / 4;
    const colorBuckets = {};

    let maxSaturation = -1;
    let accentColor = [220, 100, 50]; // Fallback cálido
    let dominantColor = [40, 50, 60];
    let maxBucketCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue; // Ignorar transparencias

      // Cuantizar en bloques de 16 para agrupar tonos similares
      const qr = Math.floor(r / 24) * 24;
      const qg = Math.floor(g / 24) * 24;
      const qb = Math.floor(b / 24) * 24;
      const key = `${qr},${qg},${qb}`;

      colorBuckets[key] = (colorBuckets[key] || 0) + 1;
      if (colorBuckets[key] > maxBucketCount) {
        maxBucketCount = colorBuckets[key];
        dominantColor = [r, g, b];
      }

      // Buscar el color con mayor saturación para acentos
      const sat = getSaturation(r, g, b);
      const lum = getLuminance(r, g, b);
      if (sat > maxSaturation && lum > 0.15 && lum < 0.85) {
        maxSaturation = sat;
        accentColor = [r, g, b];
      }
    }

    const domLum = getLuminance(...dominantColor);
    const isDominantDark = domLum < 0.45;

    return {
      primary: rgbToHex(...dominantColor),
      accent: rgbToHex(...accentColor),
      // Si la portada es oscura, fondo crema suave o pizarra según contraste
      background: isDominantDark ? '#0F172A' : '#FAF9F6',
      surface: isDominantDark ? '#1E293B' : '#FFFFFF',
      text: isDominantDark ? '#F8FAFC' : '#1E293B',
      mutedText: isDominantDark ? '#94A3B8' : '#64748B',
      isDark: isDominantDark
    };
  } catch (error) {
    console.error('Error al extraer paleta cromática:', error);
    // Paleta editorial segura de respaldo
    return {
      primary: '#1E293B',
      accent: '#C2410C',
      background: '#FDFBF7',
      surface: '#FFFFFF',
      text: '#0F172A',
      mutedText: '#64748B',
      isDark: false
    };
  }
}

module.exports = {
  extractBookPalette,
  rgbToHex,
  getLuminance
};
