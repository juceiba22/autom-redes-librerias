/**
 * Plantillas de diseño de carruseles (1080 x 1350) para Instagram.
 *
 * - Dos estilos: "cinematic" (tapa desenfocada, tipografía condensada) y
 *   "editorial" (revista literaria, serif clásica).
 * - Los colores se extraen de la tapa y se ajustan para garantizar contraste (WCAG ≥ 4.5).
 * - Solo usa SVG nativo (sin <foreignObject>) para poder exportar a JPEG.
 * - Al exportar, las fuentes se incrustan en el SVG (una imagen SVG no puede cargar
 *   fuentes externas y caería en Arial/Georgia).
 */
(function () {
  const W = 1080, H = 1350;

  const FONT_FILES = [
    { family: 'CD Anton', file: 'fonts/anton-400.woff2', weight: '400', style: 'normal' },
    { family: 'CD Inter', file: 'fonts/inter-var.woff2', weight: '400 800', style: 'normal' },
    { family: 'CD Playfair', file: 'fonts/playfair-var.woff2', weight: '400 900', style: 'normal' },
    { family: 'CD Playfair', file: 'fonts/playfair-italic-var.woff2', weight: '400 900', style: 'italic' }
  ];
  const ANTON = "'CD Anton', Impact, 'Arial Narrow', sans-serif";
  const INTER = "'CD Inter', Arial, sans-serif";
  const PLAY = "'CD Playfair', Georgia, serif";

  const STYLES = {
    cinematic: { label: 'Cinemático' },
    editorial: { label: 'Editorial' }
  };

  // ---------------------------------------------------------------------------
  // Fuentes
  // ---------------------------------------------------------------------------
  // Registrar las fuentes en la página (para la vista previa y para medir texto)
  const pageCss = FONT_FILES.map(f =>
    `@font-face{font-family:'${f.family}';src:url('${f.file}') format('woff2');font-weight:${f.weight};font-style:${f.style};font-display:block;}`
  ).join('');
  const styleEl = document.createElement('style');
  styleEl.textContent = pageCss;
  document.head.appendChild(styleEl);

  const ready = Promise.all([
    document.fonts.load(`400 40px 'CD Anton'`),
    document.fonts.load(`400 40px 'CD Inter'`), document.fonts.load(`800 40px 'CD Inter'`),
    document.fonts.load(`400 40px 'CD Playfair'`), document.fonts.load(`900 40px 'CD Playfair'`),
    document.fonts.load(`italic 400 40px 'CD Playfair'`), document.fonts.load(`italic 700 40px 'CD Playfair'`)
  ]).catch(err => console.warn('No se pudieron cargar las fuentes del carrusel:', err));

  let embeddedCssPromise = null;
  function getEmbeddedFontCss() {
    if (!embeddedCssPromise) {
      embeddedCssPromise = Promise.all(FONT_FILES.map(async f => {
        const res = await fetch(f.file);
        if (!res.ok) throw new Error(`No se pudo cargar la fuente ${f.file} (${res.status})`);
        const dataUrl = await blobToDataUrl(await res.blob());
        return `@font-face{font-family:'${f.family}';src:url(${dataUrl.replace(/^data:[^;]*;/, 'data:font/woff2;')}) format('woff2');font-weight:${f.weight};font-style:${f.style};}`;
      })).then(parts => parts.join('')).catch(err => {
        embeddedCssPromise = null;
        throw err;
      });
    }
    return embeddedCssPromise;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  // ---------------------------------------------------------------------------
  // Texto
  // ---------------------------------------------------------------------------
  const measureCtx = document.createElement('canvas').getContext('2d');
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const upper = s => String(s || '').toLocaleUpperCase('es');

  function wrapLines(text, font, widthAt) {
    measureCtx.font = font;
    const lines = [];
    let cur = '';
    for (const word of String(text || '').replace(/\s+/g, ' ').trim().split(' ')) {
      if (!word) continue;
      const cand = cur ? cur + ' ' + word : word;
      if (cur && measureCtx.measureText(cand).width > widthAt(lines.length)) {
        lines.push(cur);
        cur = word;
      } else {
        cur = cand;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function truncateLines(lines, maxLines, font, widthAt) {
    if (lines.length <= maxLines) return lines;
    const out = lines.slice(0, maxLines);
    measureCtx.font = font;
    let last = out[maxLines - 1];
    while (last.includes(' ') && measureCtx.measureText(last + '…').width > widthAt(maxLines - 1)) {
      last = last.slice(0, last.lastIndexOf(' '));
    }
    out[maxLines - 1] = last.replace(/[\s,.;:]+$/, '') + '…';
    return out;
  }

  /**
   * Bloque de texto multilínea. Prueba los tamaños de `sizes` (de mayor a menor)
   * hasta que entre en `maxLines`; si ninguno entra, recorta con "…".
   * Devuelve { svg, bottom, size, lines }.
   */
  function textBlock(text, o) {
    const sizes = o.sizes || [o.size];
    const widthAt = i => Array.isArray(o.width) ? (o.width[i] ?? o.width[o.width.length - 1]) : o.width;
    const fontFor = size => `${o.italic ? 'italic ' : ''}${o.weight || 400} ${size}px ${o.family}`;
    let size = sizes[sizes.length - 1];
    let lines = null;
    const fitsWidth = (l, s) => {
      measureCtx.font = fontFor(s);
      return l.every((ln, i) => measureCtx.measureText(ln).width <= widthAt(i) + 1);
    };
    for (const s of sizes) {
      const l = wrapLines(text, fontFor(s), widthAt);
      if ((!o.maxLines || l.length <= o.maxLines) && fitsWidth(l, s)) { size = s; lines = l; break; }
    }
    if (!lines) {
      lines = wrapLines(text, fontFor(size), widthAt);
      if (o.maxLines) lines = truncateLines(lines, o.maxLines, fontFor(size), widthAt);
      // Palabras sueltas más anchas que el espacio (ej. un @usuario largo): recortar por caracteres
      measureCtx.font = fontFor(size);
      lines = lines.map((ln, i) => {
        if (measureCtx.measureText(ln).width <= widthAt(i) + 1) return ln;
        let cut = ln;
        while (cut.length > 1 && measureCtx.measureText(cut + '…').width > widthAt(i)) cut = cut.slice(0, -1);
        return cut + '…';
      });
    }
    if (!lines.length) return { svg: '', bottom: o.y, size, lines };

    const step = size * (o.lh || 1.2);
    const xAt = i => Array.isArray(o.xs) ? (o.xs[i] ?? o.xs[o.xs.length - 1]) : o.x;
    const spans = lines.map((l, i) => `<tspan x="${xAt(i)}" y="${(o.y + size * 0.92 + i * step).toFixed(1)}">${esc(l)}</tspan>`).join('');
    return {
      svg: `<text font-family="${esc(o.family)}" font-size="${size}" font-weight="${o.weight || 400}"${o.italic ? ' font-style="italic"' : ''} fill="${o.fill}" text-anchor="${o.anchor || 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.opacity ? ` opacity="${o.opacity}"` : ''}>${spans}</text>`,
      bottom: o.y + size * 0.92 + (lines.length - 1) * step + size * 0.28,
      size,
      lines
    };
  }

  // Prueba un layout con cada escala (de mayor a menor) y usa la primera que entra hasta `limit`
  function fitLayout(scales, limit, build) {
    let last = null;
    for (const k of scales) {
      last = build(k);
      if (last.bottom <= limit) return last;
    }
    return last;
  }

  const line = (text, x, y, size, family, weight, fill, extra = '') =>
    `<text x="${x}" y="${y}" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(text)}</text>`;

  // ---------------------------------------------------------------------------
  // Color
  // ---------------------------------------------------------------------------
  function hexToRgb(hex) {
    const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb([h, s, l]) {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }

  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // Aclara u oscurece `fg` (manteniendo el tono) hasta que contraste ≥ `min` con `bg`
  function ensureContrast(fg, bg, min = 4.5) {
    if (contrast(fg, bg) >= min) return fg;
    const [h, s, l] = rgbToHsl(hexToRgb(fg));
    const lighten = luminance(bg) < 0.4;
    for (let step = 1; step <= 40; step++) {
      const nl = lighten ? Math.min(1, l + step * 0.02) : Math.max(0, l - step * 0.02);
      const cand = rgbToHex(hslToRgb([h, s, nl]));
      if (contrast(cand, bg) >= min) return cand;
    }
    return lighten ? '#FFFFFF' : '#111111';
  }

  function withHsl(hex, { s, l }) {
    const [h, s0, l0] = rgbToHsl(hexToRgb(hex));
    return rgbToHex(hslToRgb([h, s == null ? s0 : s, l == null ? l0 : l]));
  }

  /**
   * Analiza la tapa y devuelve { dark, accent } en hex.
   * dark: color oscuro dominante (para fondos); accent: color vivo más representativo.
   */
  const paletteCache = new Map();
  async function extractCoverColors(src) {
    if (!src) return null;
    if (paletteCache.has(src)) return paletteCache.get(src);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      // Con límite de tiempo: si la imagen no carga, se sigue con la paleta de respaldo
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout al leer la tapa')), 4000);
        img.onload = () => { clearTimeout(timer); resolve(); };
        img.onerror = () => { clearTimeout(timer); reject(new Error('no se pudo leer la tapa')); };
        img.src = src;
      });
      const size = 48;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      const bins = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
      const dark = { w: 0, r: 0, g: 0, b: 0 };
      const all = { w: 0, r: 0, g: 0, b: 0 };
      for (let i = 0; i < data.length; i += 4) {
        const rgb = [data[i], data[i + 1], data[i + 2]];
        const [h, s, l] = rgbToHsl(rgb);
        all.w++; all.r += rgb[0]; all.g += rgb[1]; all.b += rgb[2];
        if (l < 0.32) {
          const w = 1 + s;
          dark.w += w; dark.r += rgb[0] * w; dark.g += rgb[1] * w; dark.b += rgb[2] * w;
        }
        if (s > 0.35 && l > 0.2 && l < 0.85) {
          const w = s * (1 - Math.abs(l - 0.55));
          const bin = bins[Math.min(17, Math.floor(h * 18))];
          bin.w += w; bin.r += rgb[0] * w; bin.g += rgb[1] * w; bin.b += rgb[2] * w;
        }
      }
      const avg = o => [o.r / o.w, o.g / o.w, o.b / o.w];
      const darkBase = dark.w > 20 ? avg(dark) : avg(all);
      const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
      const result = {
        dark: rgbToHex(darkBase),
        accent: best.w > 3 ? rgbToHex(avg(best)) : null
      };
      paletteCache.set(src, result);
      return result;
    } catch (err) {
      console.warn('No se pudieron extraer los colores de la tapa:', err);
      return null;
    }
  }

  // Paleta final por estilo, con contraste garantizado
  function buildPalette(style, colors, fallback) {
    const baseDark = (colors && colors.dark) || (fallback && hexToRgb(fallback.background || '') && luminance(fallback.background) < 0.2 ? fallback.background : null) || '#0B1024';
    let accent = (colors && colors.accent) || (fallback && hexToRgb(fallback.accent || '') ? fallback.accent : null) || '#E0A63A';
    // Acento siempre vivo
    const [, as] = rgbToHsl(hexToRgb(accent));
    accent = withHsl(accent, { s: Math.max(as, 0.62), l: 0.6 });

    if (style === 'editorial') {
      const paper = '#F3EEE5';
      const ink = '#16181D';
      const navy = withHsl(baseDark, { s: Math.min(rgbToHsl(hexToRgb(baseDark))[1], 0.55), l: 0.15 });
      return {
        paper, ink, navy,
        muted: '#5D5E63',
        rule: 'rgba(22,24,29,0.22)',
        accentOnPaper: ensureContrast(withHsl(accent, { l: 0.38 }), paper, 4.8),
        accentOnNavy: ensureContrast(accent, navy, 4.8),
        cream: paper
      };
    }
    const bg = withHsl(baseDark, { s: Math.min(rgbToHsl(hexToRgb(baseDark))[1], 0.6), l: 0.07 });
    return {
      bg,
      accent: ensureContrast(accent, bg, 5),
      white: '#FFFFFF',
      soft: 'rgba(255,255,255,0.78)',
      onAccent: contrast('#FFFFFF', ensureContrast(accent, bg, 5)) >= 3 ? '#FFFFFF' : '#0B0B0F'
    };
  }

  // ---------------------------------------------------------------------------
  // Contenido
  // ---------------------------------------------------------------------------
  // Tres frases cortas: usa slide.items o divide el cuerpo en oraciones
  function itemsOf(slide, max = 3) {
    const items = (Array.isArray(slide.items) ? slide.items : []).map(s => String(s || '').trim()).filter(Boolean);
    if (items.length >= 2) return items.slice(0, max);
    const sentences = String(slide.body || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    return sentences.slice(0, max);
  }

  function coverImage(book, x, y, w, h, filter = '') {
    if (book.coverUrl) {
      return `<image href="${esc(book.coverUrl)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${filter ? ` filter="${filter}"` : ''}/>`;
    }
    // Sin tapa: libro genérico con el título
    return `<g${filter ? ` filter="${filter}"` : ''}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#2A2D3A"/>
      ${textBlock(book.title, { x: x + w / 2, y: y + h * 0.3, width: w - 40, sizes: [Math.round(w / 8)], maxLines: 4, family: PLAY, weight: 700, fill: '#FFFFFF', anchor: 'middle', lh: 1.1 }).svg}</g>`;
  }

  function monthLabel() {
    return upper(new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }));
  }

  // ---------------------------------------------------------------------------
  // Estilo A · Cinemático
  // ---------------------------------------------------------------------------
  function cinematic(idx, ctx) {
    const { slide, book, store, total, P } = ctx;
    const id = `c${idx}`;
    const defs = `
      <filter id="blur${id}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="34"/></filter>
      <filter id="soft${id}"><feGaussianBlur stdDeviation="10"/></filter>
      <filter id="shadow${id}" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#000" flood-opacity="0.65"/></filter>
      <linearGradient id="fade${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${P.bg}" stop-opacity="0.6"/>
        <stop offset="0.55" stop-color="${P.bg}" stop-opacity="0.84"/>
        <stop offset="1" stop-color="${P.bg}" stop-opacity="0.97"/>
      </linearGradient>
      <linearGradient id="side${id}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.25" stop-color="${P.bg}" stop-opacity="1"/><stop offset="1" stop-color="${P.bg}" stop-opacity="0.35"/>
      </linearGradient>
      <radialGradient id="glow${id}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${P.accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${P.accent}" stop-opacity="0"/>
      </radialGradient>`;
    const blurBg = `<rect width="${W}" height="${H}" fill="${P.bg}"/>
      ${book.coverUrl ? `<image href="${esc(book.coverUrl)}" x="-240" y="-240" width="${W + 480}" height="${H + 480}" preserveAspectRatio="xMidYMid slice" filter="url(#blur${id})" opacity="0.9"/>` : ''}
      <rect width="${W}" height="${H}" fill="url(#fade${id})"/>`;
    const kicker = text => `<rect x="80" y="120" width="56" height="5" fill="${P.accent}"/>
      ${line(upper(text), 156, 131, 26, INTER, 800, P.accent, 'letter-spacing="6"')}`;
    const footer = `<line x1="80" y1="1250" x2="1000" y2="1250" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2"/>
      ${line(store.handle, 80, 1300, 26, INTER, 700, P.white)}
      ${line(`${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, 1000, 1300, 26, INTER, 700, P.soft, 'text-anchor="end" letter-spacing="3"')}`;

    let body = '';
    if (slide.type === 'cover_hook') {
      const hook = slide.highlight ? slide.title : (slide.title || `¿Por qué todos hablan de ${book.title}?`);
      // El título completo (gancho + libro) no puede pasar de ~y=690 para dejar lugar a la tapa
      const hookFit = fitLayout([112, 100, 90, 80, 72, 64], 690, size => {
        const a = textBlock(upper(hook), { x: 80, y: 165, width: 920, sizes: [size], maxLines: 3, lh: 0.98, family: ANTON, fill: P.white });
        const b = slide.highlight
          ? textBlock(upper(slide.highlight), { x: 80, y: a.bottom - size * 0.09, width: 920, sizes: [size], maxLines: 3, lh: 0.98, family: ANTON, fill: P.accent })
          : { svg: '', bottom: a.bottom };
        return { svg: a.svg + b.svg, bottom: b.bottom };
      });
      const infoY = Math.min(Math.max(hookFit.bottom + 80, 640), 750);
      const coverH = Math.min(524, 1215 - (infoY + 28));
      const coverW = Math.round(coverH * 0.687);
      body = `${blurBg}${kicker(slide.category || 'Recomendación de la semana')}${hookFit.svg}
        <circle cx="790" cy="${infoY + 290}" r="330" fill="url(#glow${id})"/>
        <g transform="rotate(-5 790 ${infoY + 28 + coverH / 2})">${coverImage(book, 970 - coverW, infoY + 28, coverW, coverH, `url(#shadow${id})`)}</g>
        ${textBlock(book.author, { x: 80, y: infoY, width: 480, sizes: [44, 38], maxLines: 2, lh: 1.1, family: INTER, weight: 700, fill: P.white }).svg}
        ${textBlock([book.publisher, book.genre].filter(Boolean).join(' · '), { x: 80, y: infoY + 110, width: 480, sizes: [30], maxLines: 2, lh: 1.25, family: INTER, weight: 500, fill: P.soft }).svg}
        <rect x="80" y="${infoY + 230}" width="250" height="72" rx="36" fill="${P.white}"/>
        ${line('Deslizá  →', 205, infoY + 277, 28, INTER, 800, P.bg, 'text-anchor="middle"')}`;
    } else if (slide.type === 'quote') {
      const q = textBlock(slide.quote || slide.body, { x: 80, y: 470, width: 900, sizes: [92, 80, 68, 58], maxLines: 6, lh: 1.14, family: PLAY, weight: 700, italic: true, fill: P.white });
      body = `<rect width="${W}" height="${H}" fill="${P.bg}"/>
        ${book.coverUrl ? `<image href="${esc(book.coverUrl)}" x="380" y="-120" width="900" height="1310" preserveAspectRatio="xMidYMid slice" opacity="0.2" filter="url(#soft${id})"/>` : ''}
        <rect width="${W}" height="${H}" fill="url(#side${id})"/>
        ${kicker(slide.category || 'La frase')}
        ${line('“', 62, 560, 520, PLAY, 900, P.accent)}
        ${q.svg}
        <rect x="80" y="${q.bottom + 50}" width="90" height="6" fill="${P.accent}"/>
        ${line(book.author, 80, q.bottom + 120, 34, INTER, 700, P.white)}
        ${line(book.title, 80, q.bottom + 168, 30, INTER, 400, P.soft, 'font-style="italic"')}`;
    } else if (slide.type === 'synopsis') {
      const items = itemsOf(slide);
      const buildPremise = (size, extra = 0) => {
        let y = 180, out = '';
        const gap = Math.round(size * 0.45 + extra);
        items.forEach((t, i) => {
          out += line(String(i + 1).padStart(2, '0'), 80, y + 40, 28, INTER, 800, P.accent, 'letter-spacing="4"');
          const b = textBlock(upper(t), { x: 80, y: y + 52, width: 900, sizes: [size], maxLines: 3, lh: 1.0, family: ANTON, fill: i === items.length - 1 ? P.accent : P.white });
          out += b.svg;
          y = b.bottom + gap;
        });
        return { svg: out, bottom: y, size };
      };
      let lay = fitLayout([112, 104, 96, 88, 80, 72], 1120, s => buildPremise(s));
      // Repartir el espacio sobrante entre las frases para que el slide no quede vacío abajo
      if (lay.bottom < 1120 && items.length) lay = buildPremise(lay.size, Math.min((1120 - lay.bottom) / items.length, 90));
      body = `${blurBg}${kicker(slide.category || 'La premisa')}${lay.svg}
        ${lay.bottom + 50 < 1210 ? line('Sin spoilers. Prometido.', 80, lay.bottom + 50, 34, INTER, 500, P.soft) : ''}`;
    } else if (slide.type === 'highlights') {
      const head = textBlock(upper(slide.title || 'Por qué leerlo'), { x: 80, y: 165, width: 920, sizes: [110, 96, 84], maxLines: 2, lh: 0.98, family: ANTON, fill: P.white });
      const lay = fitLayout([60, 54, 48, 42], slide.fans ? 1090 : 1200, size => {
        let y = head.bottom + 60, out = '';
        const row = Math.round(size * 3.4);
        itemsOf(slide).forEach((t, i) => {
          out += `<line x1="80" y1="${y}" x2="1000" y2="${y}" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2"/>`;
          out += line(String(i + 1), 80, y + Math.round(size * 2.55), Math.round(size * 2.5), ANTON, 400, P.accent);
          const b = textBlock(t, { x: 80 + Math.round(size * 2.4), y: y + Math.round(size * 0.75), width: 920 - Math.round(size * 2.4), sizes: [size], maxLines: 3, lh: 1.22, family: INTER, weight: 700, fill: P.white });
          out += b.svg;
          y = Math.max(b.bottom, y + row) + 30;
        });
        return { svg: out, bottom: y };
      });
      const y = lay.bottom, out = lay.svg;
      const fans = slide.fans ? `<rect x="80" y="${y + 10}" width="920" height="96" rx="48" fill="none" stroke="${P.accent}" stroke-width="3"/>
        ${textBlock(`Para fans de ${slide.fans}`, { x: 540, y: y + 36, width: 860, sizes: [32, 28], maxLines: 1, family: INTER, weight: 600, fill: P.white, anchor: 'middle' }).svg}` : '';
      body = `<rect width="${W}" height="${H}" fill="${P.bg}"/>${kicker(slide.category || 'Por qué leerlo')}${head.svg}${out}${fans}`;
    } else {
      // cta
      const t = textBlock(upper(slide.title || 'Disponible hoy'), { x: 540, y: 800, width: 940, sizes: [140, 120, 100, 84, 72], maxLines: 2, lh: 1, family: ANTON, fill: P.white, anchor: 'middle' });
      const pillText = `Pedilo por DM a ${store.handle}`;
      measureCtx.font = `800 34px ${INTER}`;
      const pillW = Math.min(940, measureCtx.measureText(pillText).width + 110);
      body = `${blurBg}
        <circle cx="540" cy="460" r="400" fill="url(#glow${id})"/>
        ${coverImage(book, 330, 150, 420, 612, `url(#shadow${id})`)}
        ${t.svg}
        ${textBlock(store.name, { x: 540, y: t.bottom + 26, width: 900, sizes: [36, 30], maxLines: 1, family: INTER, weight: 600, fill: P.soft, anchor: 'middle' }).svg}
        <rect x="${540 - pillW / 2}" y="${t.bottom + 100}" width="${pillW}" height="92" rx="46" fill="${P.accent}"/>
        ${line(pillText, 540, t.bottom + 160, 34, INTER, 800, P.onAccent, 'text-anchor="middle"')}
        ${slide.body ? textBlock(slide.body, { x: 540, y: t.bottom + 222, width: 900, sizes: [28], maxLines: 1, family: INTER, weight: 500, fill: P.soft, anchor: 'middle' }).svg : ''}`;
    }
    return { defs, body: body + footer.replace(slide.type === 'cta' ? /<line[^>]*>/ : /$^/, '') };
  }

  // ---------------------------------------------------------------------------
  // Estilo B · Editorial
  // ---------------------------------------------------------------------------
  function editorial(idx, ctx) {
    const { slide, book, store, total, P } = ctx;
    const id = `e${idx}`;
    const defs = `<filter id="shadow${id}" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="-14" dy="26" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/></filter>`;
    const mast = `${line('LA RECOMENDACIÓN', 80, 104, 22, INTER, 800, P.ink, 'letter-spacing="7"')}
      ${line(monthLabel(), 1000, 104, 22, INTER, 500, P.muted, 'text-anchor="end" letter-spacing="3"')}
      <line x1="80" y1="128" x2="1000" y2="128" stroke="${P.ink}" stroke-width="2"/>
      <line x1="80" y1="136" x2="1000" y2="136" stroke="${P.ink}" stroke-width="0.8"/>`;
    const kicker = text => line(upper(text), 80, 190, 22, INTER, 800, P.accentOnPaper, 'letter-spacing="6"');
    const footer = (onDark = false) => {
      const c1 = onDark ? P.cream : P.ink, c2 = onDark ? 'rgba(243,238,229,0.72)' : P.muted;
      measureCtx.font = `700 30px ${PLAY}`;
      const nameText = store.shortName || store.name;
      const nameW = Math.min(measureCtx.measureText(nameText).width, 520);
      measureCtx.font = `500 24px ${INTER}`;
      const handleFits = 80 + nameW + 24 + measureCtx.measureText(store.handle).width <= 850;
      return `<line x1="80" y1="1240" x2="1000" y2="1240" stroke="${onDark ? 'rgba(243,238,229,0.3)' : P.rule}" stroke-width="1.5"/>
        ${textBlock(nameText, { x: 80, y: 1266, width: 520, sizes: [30, 26], maxLines: 1, family: PLAY, weight: 700, fill: c1 }).svg}
        ${handleFits ? line(store.handle, 80 + nameW + 24, 1292, 24, INTER, 500, c2) : ''}
        ${line(`${String(idx + 1).padStart(2, '0')} — ${String(total).padStart(2, '0')}`, 1000, 1292, 24, INTER, 600, c2, 'text-anchor="end" letter-spacing="3"')}`;
    };
    const paper = `<rect width="${W}" height="${H}" fill="${P.paper}"/>${mast}`;

    let body = '', dark = false;
    if (slide.type === 'cover_hook') {
      const hook = slide.highlight ? slide.title : (slide.title || '¿Por qué todos hablan de');
      const t1 = textBlock(hook, { x: 80, y: 180, width: 920, sizes: [76, 68, 60], maxLines: 3, lh: 1.1, family: PLAY, weight: 400, fill: P.ink });
      const t2 = textBlock(slide.highlight || `${book.title}?`, { x: 80, y: t1.bottom - 6, width: 920, sizes: [96, 84, 72], maxLines: 2, lh: 1.02, family: PLAY, weight: 700, italic: true, fill: P.accentOnPaper });
      const top = Math.max(t2.bottom + 90, 640);
      const author = textBlock(book.author, { x: 130, y: top + 130, width: 420, sizes: [58, 50, 44], maxLines: 3, lh: 1.1, family: PLAY, weight: 700, fill: P.cream });
      body = `${paper}${t1.svg}${t2.svg}
        <rect x="80" y="${top}" width="920" height="${1200 - top}" fill="${P.navy}"/>
        ${coverImage(book, 610, top - 70, 330, 481, `url(#shadow${id})`)}
        ${line(upper(book.genre || slide.subtitle || 'Recomendado'), 130, top + 90, 22, INTER, 800, P.accentOnNavy, 'letter-spacing="5"')}
        ${author.svg}
        ${book.publisher ? line(`Editorial ${book.publisher}`, 130, author.bottom + 34, 26, INTER, 500, 'rgba(243,238,229,0.72)') : ''}
        ${line('DESLIZÁ →', 130, 1150, 24, INTER, 700, P.cream, 'letter-spacing="3"')}`;
    } else if (slide.type === 'quote') {
      const q = textBlock(slide.quote || slide.body, { x: 540, y: 560, width: 860, sizes: [88, 76, 64, 56], maxLines: 6, lh: 1.15, family: PLAY, weight: 400, italic: true, fill: P.ink, anchor: 'middle' });
      body = `${paper}
        ${line('“', 540, 560, 300, PLAY, 900, P.accentOnPaper, 'text-anchor="middle"')}
        ${q.svg}
        <line x1="490" y1="${q.bottom + 60}" x2="590" y2="${q.bottom + 60}" stroke="${P.accentOnPaper}" stroke-width="3"/>
        ${line(upper(book.author), 540, q.bottom + 125, 24, INTER, 800, P.ink, 'text-anchor="middle" letter-spacing="6"')}
        ${line(book.title, 540, q.bottom + 170, 30, PLAY, 400, P.muted, 'text-anchor="middle" font-style="italic"')}`;
    } else if (slide.type === 'synopsis') {
      const head = textBlock(slide.title || 'La premisa', { x: 80, y: 205, width: 920, sizes: [70, 62], maxLines: 2, lh: 1.1, family: PLAY, weight: 700, fill: P.ink });
      const text = String(slide.body || itemsOf(slide).join(' ')).trim();
      const first = text.charAt(0), rest = text.slice(1);
      const bodyY = head.bottom + 70;
      measureCtx.font = `900 230px ${PLAY}`;
      const capRight = 72 + measureCtx.measureText(upper(first)).width;
      const indent = Math.round(capRight + 28);
      const b = fitLayout([52, 48, 44, 40, 36], 1040, size => {
        // Líneas con sangría: las que quedan a la altura de la capitular (230px)
        const indented = Math.max(1, Math.ceil((205 - 0.17 * size) / (1.5 * size)));
        const widths = [...Array(indented).fill(1000 - indent), 920];
        const xs = [...Array(indented).fill(indent), 80];
        return textBlock(rest, { x: 80, y: bodyY, width: widths, xs, sizes: [size], maxLines: 14, lh: 1.5, family: PLAY, fill: P.ink });
      });
      body = `${paper}${kicker(slide.category || 'La premisa')}${head.svg}
        ${line(upper(first), 72, bodyY + 188, 230, PLAY, 900, P.accentOnPaper)}
        ${b.svg}
        ${b.bottom + 150 < 1200 ? `${coverImage(book, 850, Math.min(b.bottom + 60, 1000), 150, 218, `url(#shadow${id})`)}
        ${line('Sin spoilers, palabra de librero.', 80, Math.min(b.bottom + 150, 1100), 30, PLAY, 400, P.muted, 'font-style="italic"')}` : ''}`;
    } else if (slide.type === 'highlights') {
      const head = textBlock(slide.title || 'Por qué leerlo', { x: 80, y: 205, width: 920, sizes: [70, 62], maxLines: 2, lh: 1.1, family: PLAY, weight: 700, fill: P.ink });
      const lay = fitLayout([56, 52, 48, 44, 40], slide.fans ? 1060 : 1180, size => {
        let y = head.bottom + 50, out = '';
        itemsOf(slide).forEach((t, i) => {
          out += `<line x1="80" y1="${y}" x2="1000" y2="${y}" stroke="${P.rule}" stroke-width="1.5"/>`;
          out += line(['I.', 'II.', 'III.'][i], 80, y + Math.round(size * 1.95), Math.round(size * 1.35), PLAY, 700, P.accentOnPaper, 'font-style="italic"');
          const b = textBlock(t, { x: 230, y: y + Math.round(size * 0.9), width: 770, sizes: [size], maxLines: 3, lh: 1.3, family: PLAY, fill: P.ink });
          out += b.svg;
          y = Math.max(b.bottom, y + Math.round(size * 2.9)) + 30;
        });
        return { svg: out, bottom: y };
      });
      const y = lay.bottom, out = lay.svg;
      const fans = slide.fans ? `<rect x="80" y="${y + 10}" width="920" height="120" fill="${P.navy}"/>
        ${line('IDEAL PARA FANS DE', 130, y + 60, 20, INTER, 800, P.accentOnNavy, 'letter-spacing="5"')}
        ${textBlock(slide.fans, { x: 130, y: y + 72, width: 820, sizes: [36, 30], maxLines: 1, family: PLAY, italic: true, fill: P.cream }).svg}` : '';
      body = `${paper}${kicker(slide.category || 'El veredicto del librero')}${head.svg}${out}${fans}`;
    } else {
      dark = true;
      const t = textBlock(slide.title || 'Te está esperando', { x: 80, y: 205, width: 920, sizes: [84, 72], maxLines: 2, lh: 1.08, family: PLAY, weight: 700, fill: P.ink });
      const where = textBlock(`en ${store.name}`, { x: 80, y: t.bottom - 4, width: 920, sizes: [52, 44], maxLines: 1, family: PLAY, italic: true, fill: P.accentOnPaper });
      const top = where.bottom + 110;
      body = `${paper}${kicker('Disponible hoy')}${t.svg}${where.svg}
        <rect x="0" y="${top}" width="${W}" height="${H - top}" fill="${P.navy}"/>
        ${coverImage(book, 90, top - 70, 410, 597, `url(#shadow${id})`)}
        ${line('Pedilo por DM', 560, top + 190, 56, PLAY, 400, P.cream, 'font-style="italic"')}
        ${textBlock(store.handle, { x: 560, y: top + 225, width: 440, sizes: [34, 28, 24], maxLines: 1, family: INTER, weight: 700, fill: P.cream }).svg}
        ${slide.body ? textBlock(slide.body, { x: 560, y: top + 300, width: 440, sizes: [26], maxLines: 3, lh: 1.4, family: INTER, weight: 500, fill: 'rgba(243,238,229,0.72)' }).svg : ''}`;
    }
    return { defs, body: body + footer(dark) };
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------
  /**
   * data: { style, book, slides, store: {name, handle}, colors, palette }
   * options.fontCss: CSS con las fuentes incrustadas (para exportar)
   */
  function renderSlide(data, idx, options = {}) {
    const slide = data.slides[idx];
    if (!slide) return '';
    const style = STYLES[data.style] ? data.style : 'cinematic';
    const P = buildPalette(style, data.colors, data.palette);
    const store = {
      name: data.store.name,
      shortName: String(data.store.name || '').split(/\s[-–—·]\s/)[0],
      handle: data.store.handle
    };
    const ctx = { slide, book: data.book || {}, store, total: data.slides.length, P };
    const { defs, body } = style === 'editorial' ? editorial(idx, ctx) : cinematic(idx, ctx);
    const fontStyle = options.fontCss ? `<style>${options.fontCss}</style>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}"><defs>${fontStyle}${defs}</defs>${body}</svg>`;
  }

  // Estilo sugerido según el género
  function suggestStyle(genre) {
    const g = String(genre || '').toLowerCase();
    return /thriller|polic|negra|terror|horror|suspen|misterio|fantas|ciencia ficci|sci-?fi|distop|juvenil|young adult|acci[oó]n|crimen/.test(g)
      ? 'cinematic' : 'editorial';
  }

  window.CarouselDesigns = { STYLES, ready, renderSlide, getEmbeddedFontCss, extractCoverColors, suggestStyle, contrast };
})();
