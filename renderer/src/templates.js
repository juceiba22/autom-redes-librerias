/**
 * Generador de plantillas SVG vectoriales de alta fidelidad para carruseles de Instagram (1080 x 1350 px)
 */

/**
 * Divide un texto en líneas para que quepa dentro de un ancho máximo en caracteres
 */
function wrapText(text, maxCharsPerLine = 32) {
  if (!text) return [];
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Escapa caracteres especiales XML/SVG
 */
function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Construye el SVG para una diapositiva individual
 */
function buildSlideSvg({
  slideNumber = 1,
  totalSlides = 5,
  slideType = 'cover_hook',
  title = '',
  subtitle = '',
  bodyText = '',
  quoteText = '',
  bookTitle = '',
  bookAuthor = '',
  coverImageUrl = '',
  bookstoreName = 'Librería',
  instagramHandle = '@libreria',
  palette = {},
  theme = 'editorial_classic',
  width = 1080,
  height = 1350
}) {
  const bg = palette.background || '#FDFBF7';
  const primary = palette.primary || '#1E293B';
  const accent = palette.accent || '#C2410C';
  const textColor = palette.text || '#0F172A';
  const mutedText = palette.mutedText || '#64748B';
  const surface = palette.surface || '#FFFFFF';
  const isDark = palette.isDark || false;

  const fontFamilySerif = "'Playfair Display', Georgia, serif";
  const fontFamilySans = "'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif";

  // Pie de página unificado
  const footerSvg = `
    <!-- Pie de página unificado con identidad de marca -->
    <g transform="translate(80, ${height - 110})">
      <line x1="0" y1="0" x2="${width - 160}" y2="0" stroke="${accent}" stroke-width="2" opacity="0.4" />
      <text x="0" y="45" font-family="${fontFamilySans}" font-size="24" font-weight="700" fill="${primary}" letter-spacing="1">
        ${escapeXml(bookstoreName.toUpperCase())}
      </text>
      <text x="0" y="72" font-family="${fontFamilySans}" font-size="20" fill="${mutedText}">
        ${escapeXml(instagramHandle)}
      </text>
      
      <!-- Indicador de slide -->
      <rect x="${width - 270}" y="20" width="110" height="42" rx="21" fill="${accent}" opacity="0.15" />
      <text x="${width - 215}" y="48" font-family="${fontFamilySans}" font-size="20" font-weight="700" fill="${accent}" text-anchor="middle">
        ${slideNumber} / ${totalSlides} ${slideNumber < totalSlides ? '→' : '✓'}
      </text>
    </g>
  `;

  // Cabecera superior con etiqueta temática
  const headerBadge = (label) => `
    <g transform="translate(80, 90)">
      <rect x="0" y="0" width="${label.length * 13 + 36}" height="40" rx="20" fill="${accent}" opacity="0.12" />
      <text x="18" y="26" font-family="${fontFamilySans}" font-size="16" font-weight="700" fill="${accent}" letter-spacing="2">
        ${escapeXml(label.toUpperCase())}
      </text>
    </g>
  `;

  let contentSvg = '';

  switch (slideType) {
    case 'cover_hook': {
      const hookLines = wrapText(title || 'UN LIBRO QUE NO PODRÁS SOLTAR', 24);
      const hookTextSvg = hookLines.map((line, idx) => `
        <tspan x="80" dy="${idx === 0 ? 0 : 70}">${escapeXml(line)}</tspan>
      `).join('');

      contentSvg = `
        ${headerBadge('RECOMENDACIÓN DE LA SEMANA')}
        
        <!-- Gancho Principal -->
        <text x="80" y="230" font-family="${fontFamilySerif}" font-size="56" font-weight="800" fill="${textColor}" letter-spacing="-0.5">
          ${hookTextSvg}
        </text>

        <!-- Subtítulo o Bajada -->
        <text x="80" y="${250 + (hookLines.length * 65)}" font-family="${fontFamilySans}" font-size="26" fill="${mutedText}">
          ${escapeXml(subtitle || 'Reseña y análisis sin spoilers')}
        </text>

        <!-- Contenedor Maqueta Libro Portada con Sombra -->
        <g transform="translate(${width / 2 - 200}, 520)">
          <!-- Sombra proyectada del libro -->
          <rect x="15" y="15" width="370" height="540" rx="16" fill="#000000" opacity="0.25" filter="blur(20px)" />
          <rect x="10" y="10" width="380" height="550" rx="14" fill="#000000" opacity="0.18" />
          
          <!-- Portada -->
          ${coverImageUrl ? `
            <clipPath id="coverClip">
              <rect x="0" y="0" width="400" height="570" rx="12" />
            </clipPath>
            <image href="${escapeXml(coverImageUrl)}" x="0" y="0" width="400" height="570" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)" />
          ` : `
            <rect x="0" y="0" width="400" height="570" rx="12" fill="${primary}" />
            <text x="200" y="260" font-family="${fontFamilySerif}" font-size="34" font-weight="700" fill="#FFFFFF" text-anchor="middle">
              ${escapeXml(bookTitle || 'Portada del Libro')}
            </text>
            <text x="200" y="310" font-family="${fontFamilySans}" font-size="22" fill="#E2E8F0" text-anchor="middle">
              ${escapeXml(bookAuthor)}
            </text>
          `}
          
          <!-- Lomo brillante sutil del libro -->
          <rect x="0" y="0" width="18" height="570" rx="4" fill="#FFFFFF" opacity="0.25" />
        </g>

        <!-- Datos del libro al pie de la portada -->
        <g transform="translate(80, 1150)">
          <text x="0" y="0" font-family="${fontFamilySerif}" font-size="32" font-weight="700" fill="${primary}">
            ${escapeXml(bookTitle)}
          </text>
          <text x="0" y="34" font-family="${fontFamilySans}" font-size="22" fill="${mutedText}">
            de ${escapeXml(bookAuthor)}
          </text>
        </g>
      `;
      break;
    }

    case 'quote': {
      const quoteLines = wrapText(quoteText || bodyText || title, 22);
      const quoteTextSvg = quoteLines.map((line, idx) => `
        <tspan x="110" dy="${idx === 0 ? 0 : 74}">${escapeXml(line)}</tspan>
      `).join('');

      contentSvg = `
        ${headerBadge('CITA MEMORABLE')}

        <!-- Comilla gigante de adorno -->
        <text x="70" y="380" font-family="${fontFamilySerif}" font-size="240" font-weight="900" fill="${accent}" opacity="0.18">
          “
        </text>

        <!-- Tarjeta de Fondo para la Cita -->
        <rect x="70" y="320" width="${width - 140}" height="640" rx="28" fill="${surface}" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.2" filter="drop-shadow(0px 15px 30px rgba(0,0,0,0.06))" />

        <!-- Texto de la Cita Literaria -->
        <text x="110" y="440" font-family="${fontFamilySerif}" font-size="44" font-style="italic" font-weight="600" fill="${textColor}">
          ${quoteTextSvg}
        </text>

        <!-- Autor y referencia -->
        <g transform="translate(110, 880)">
          <line x1="0" y1="0" x2="60" y2="0" stroke="${accent}" stroke-width="4" />
          <text x="80" y="8" font-family="${fontFamilySans}" font-size="26" font-weight="700" fill="${primary}">
            ${escapeXml(bookTitle)}
          </text>
          <text x="80" y="38" font-family="${fontFamilySans}" font-size="22" fill="${mutedText}">
            ${escapeXml(bookAuthor)} — ${escapeXml(subtitle || 'Página inolvidable')}
          </text>
        </g>
      `;
      break;
    }

    case 'synopsis': {
      const titleLines = wrapText(title || 'DE QUÉ TRATA ESTA HISTORIA', 26);
      const titleSvg = titleLines.map((line, idx) => `
        <tspan x="80" dy="${idx === 0 ? 0 : 64}">${escapeXml(line)}</tspan>
      `).join('');

      const bodyLines = wrapText(bodyText || 'Una narrativa que te atrapa desde la primera página...', 34);
      const bodySvg = bodyLines.map((line, idx) => `
        <tspan x="110" dy="${idx === 0 ? 0 : 48}">${escapeXml(line)}</tspan>
      `).join('');

      contentSvg = `
        ${headerBadge('LA PREMISA')}

        <text x="80" y="240" font-family="${fontFamilySerif}" font-size="52" font-weight="800" fill="${textColor}">
          ${titleSvg}
        </text>

        <!-- Bloque de lectura -->
        <rect x="70" y="340" width="${width - 140}" height="680" rx="24" fill="${surface}" stroke="${primary}" stroke-width="1" stroke-opacity="0.1" />

        <text x="110" y="430" font-family="${fontFamilySans}" font-size="30" font-weight="400" fill="${textColor}" line-height="1.6">
          ${bodySvg}
        </text>

        <!-- Píldoras de Género y Atmósfera -->
        <g transform="translate(110, 930)">
          <rect x="0" y="0" width="220" height="46" rx="23" fill="${primary}" opacity="0.08" />
          <text x="110" y="30" font-family="${fontFamilySans}" font-size="19" font-weight="600" fill="${primary}" text-anchor="middle">
            📖 Gran Narrativa
          </text>

          <rect x="240" y="0" width="240" height="46" rx="23" fill="${accent}" opacity="0.15" />
          <text x="360" y="30" font-family="${fontFamilySans}" font-size="19" font-weight="700" fill="${accent}" text-anchor="middle">
            ⚡ Ritmo Imparable
          </text>
        </g>
      `;
      break;
    }

    case 'highlights': {
      const titleLines = wrapText(title || 'POR QUÉ DEBERÍAS LEERLO', 26);
      const titleSvg = titleLines.map((line, idx) => `
        <tspan x="80" dy="${idx === 0 ? 0 : 64}">${escapeXml(line)}</tspan>
      `).join('');

      const bodyLines = wrapText(bodyText || 'Un libro imprescindible para los amantes de las buenas historias.', 32);
      const bodySvg = bodyLines.map((line, idx) => `
        <tspan x="120" dy="${idx === 0 ? 0 : 50}">${escapeXml(line)}</tspan>
      `).join('');

      contentSvg = `
        ${headerBadge('EL VEREDICTO')}

        <text x="80" y="240" font-family="${fontFamilySerif}" font-size="52" font-weight="800" fill="${textColor}">
          ${titleSvg}
        </text>

        <!-- Tarjeta de Highlights con badge de calificación -->
        <rect x="70" y="330" width="${width - 140}" height="700" rx="26" fill="${surface}" stroke="${accent}" stroke-width="2" stroke-opacity="0.2" />

        <g transform="translate(120, 420)">
          <text x="0" y="0" font-family="${fontFamilySans}" font-size="46" fill="#F59E0B">★★★★★</text>
          <text x="210" y="-8" font-family="${fontFamilySans}" font-size="28" font-weight="700" fill="${primary}">
            5/5 Excelente
          </text>
        </g>

        <text x="120" y="520" font-family="${fontFamilySans}" font-size="32" font-weight="400" fill="${textColor}">
          ${bodySvg}
        </text>

        <g transform="translate(120, 940)">
          <text x="0" y="0" font-family="${fontFamilySans}" font-size="24" font-weight="600" fill="${accent}">
            Ideal para lectores de: Novela contemporánea y suspense
          </text>
        </g>
      `;
      break;
    }

    case 'cta':
    default: {
      const ctaTitleLines = wrapText(title || '¿LISTO PARA TU PRÓXIMA LECTURA?', 22);
      const ctaTitleSvg = ctaTitleLines.map((line, idx) => `
        <tspan x="${width / 2}" dy="${idx === 0 ? 0 : 68}">${escapeXml(line)}</tspan>
      `).join('');

      contentSvg = `
        ${headerBadge('DISPONIBLE EN LIBRERÍA')}

        <g transform="translate(0, 240)">
          <text x="${width / 2}" y="0" font-family="${fontFamilySerif}" font-size="54" font-weight="800" fill="${textColor}" text-anchor="middle">
            ${ctaTitleSvg}
          </text>
        </g>

        <!-- Tarjeta central de Librería -->
        <g transform="translate(80, 420)">
          <rect x="0" y="0" width="${width - 160}" height="560" rx="30" fill="${surface}" stroke="${accent}" stroke-width="2" stroke-opacity="0.3" filter="drop-shadow(0px 20px 40px rgba(0,0,0,0.08))" />

          <!-- Icono de libro / tienda -->
          <circle cx="${(width - 160) / 2}" cy="100" r="50" fill="${accent}" opacity="0.15" />
          <text x="${(width - 160) / 2}" y="115" font-family="${fontFamilySans}" font-size="44" text-anchor="middle">📚</text>

          <text x="${(width - 160) / 2}" y="200" font-family="${fontFamilySerif}" font-size="38" font-weight="700" fill="${primary}" text-anchor="middle">
            ${escapeXml(bookstoreName)}
          </text>

          <text x="${(width - 160) / 2}" y="250" font-family="${fontFamilySans}" font-size="24" fill="${mutedText}" text-anchor="middle">
            Ejemplares disponibles en tienda y envíos
          </text>

          <!-- Botón visual simulado de Acción -->
          <rect x="${(width - 160) / 2 - 220}" y="310" width="440" height="74" rx="37" fill="${accent}" />
          <text x="${(width - 160) / 2}" y="356" font-family="${fontFamilySans}" font-size="26" font-weight="700" fill="#FFFFFF" text-anchor="middle">
            PÍDELO POR MENSAJE DIRECTO
          </text>

          <text x="${(width - 160) / 2}" y="450" font-family="${fontFamilySans}" font-size="22" font-weight="600" fill="${primary}" text-anchor="middle">
            O encuéntralo en: ${escapeXml(instagramHandle)}
          </text>
        </g>

        <!-- Guardar post recordatorio -->
        <text x="${width / 2}" y="1070" font-family="${fontFamilySans}" font-size="24" fill="${mutedText}" text-anchor="middle">
          Guarda este carrusel 🔖 para no olvidar el título
        </text>
      `;
      break;
    }
  }

  // Composición completa del documento SVG
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Playfair+Display:ital,wght@0,600;0,800;1,600&amp;display=swap');
    </style>
    <!-- Fondo con gradiente sutil -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${isDark ? '#020617' : '#F1EFE9'}" />
    </linearGradient>
  </defs>

  <!-- Fondo base -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Acento decorativo sutil en esquina superior derecha -->
  <circle cx="${width + 100}" cy="-80" r="350" fill="${accent}" opacity="0.07" />

  <!-- Contenido específico de la diapositiva -->
  ${contentSvg}

  <!-- Pie de página con marca -->
  ${footerSvg}
</svg>`;
}

module.exports = {
  buildSlideSvg,
  wrapText,
  escapeXml
};
