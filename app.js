let currentSlideIdx = 0;
let currentCarouselData = null;
let activeAspectRatio = '4:5';

const SAMPLE_BOOKS = {
  1: {
    title: "Cien años de soledad",
    author: "Gabriel García Márquez",
    genre: "Ficción / Clásico",
    coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
    review: "Una obra cumbre e inmortal. La historia de la familia Buendía en Macondo no es solo una novela; es un universo fascinante donde lo mágico se entrelaza con las pasiones humanas más crudas. Prosa poética deslumbrante, personajes inolvidables como Úrsula Iguarán o el coronel Aureliano, y una reflexión sobre el destino y la soledad que conmueve profundamente.",
    quote: "Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo."
  },
  2: {
    title: "Hábitos Atómicos",
    author: "James Clear",
    genre: "Desarrollo Personal / No Ficción",
    coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800",
    review: "El libro definitivo para entender cómo los cambios diminutos del 1% diario producen resultados gigantescos con el tiempo. James Clear destruye el mito de la motivación y explica la ciencia de los sistemas, la identidad y el entorno. Práctico, directo y sin relleno.",
    quote: "No te elevas al nivel de tus metas. Caes al nivel de tus sistemas."
  },
  3: {
    title: "La Sombra del Viento",
    author: "Carlos Ruiz Zafón",
    genre: "Thriller / Misterio",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
    review: "Un homenaje insuperable a los libros y al amor por la lectura. Ambientada en una Barcelona gótica y misteriosa, Daniel Sempere descubre el Cementerio de los Libros Olvidados y un autor maldito, Julián Carax. Una trama laberíntica repleta de secretos, romance y suspenso.",
    quote: "Cada libro, cada tomo que ves, tiene alma. El alma de quien lo escribió, y el alma de quienes lo leyeron y vivieron y soñaron con él."
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadSample(1);
  setupEvents();
});

function setupEvents() {
  const reviewInput = document.getElementById('inputReviewText');
  reviewInput.addEventListener('input', () => {
    document.getElementById('charCount').textContent = reviewInput.value.length + ' caracteres';
  });

  document.getElementById('tabPreview').onclick = () => switchTab('preview');
  document.getElementById('tabEditor').onclick = () => switchTab('editor');
  document.getElementById('tabSocial').onclick = () => switchTab('social');

  document.getElementById('btnSettingsModal').onclick = () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  };
  document.getElementById('btnCloseSettings').onclick = () => {
    document.getElementById('settingsModal').classList.add('hidden');
  };
  document.getElementById('btnSaveSettings').onclick = () => {
    document.getElementById('settingsModal').classList.add('hidden');
    if (currentCarouselData) {
      currentCarouselData.bookstore.name = document.getElementById('cfgStoreName').value;
      currentCarouselData.bookstore.instagramHandle = document.getElementById('cfgIgHandle').value;
      currentCarouselData.bookstore.primaryColor = document.getElementById('cfgPrimaryColor').value;
      currentCarouselData.bookstore.accentColor = document.getElementById('cfgAccentColor').value;
      renderActiveSlide();
    }
  };

  document.getElementById('btnRatioPortrait').onclick = () => setRatio('4:5');
  document.getElementById('btnRatioSquare').onclick = () => setRatio('1:1');
  document.getElementById('btnGenerate').onclick = triggerGeneration;
  document.getElementById('inputCoverFile').onchange = handleImageUpload;
}

function setRatio(ratio) {
  activeAspectRatio = ratio;
  const btnPortrait = document.getElementById('btnRatioPortrait');
  const btnSquare = document.getElementById('btnRatioSquare');
  const container = document.getElementById('slideFrameContainer');

  if (ratio === '4:5') {
    btnPortrait.className = "px-2 py-1 bg-slate-800 text-white font-semibold rounded text-[11px]";
    btnSquare.className = "px-2 py-1 text-slate-400 hover:text-white rounded text-[11px]";
    container.classList.remove('aspect-square');
    container.classList.add('aspect-[4/5]');
  } else {
    btnSquare.className = "px-2 py-1 bg-slate-800 text-white font-semibold rounded text-[11px]";
    btnPortrait.className = "px-2 py-1 text-slate-400 hover:text-white rounded text-[11px]";
    container.classList.remove('aspect-[4/5]');
    container.classList.add('aspect-square');
  }
  if (currentCarouselData) renderActiveSlide();
}

function changeTheme() {
  if (currentCarouselData) {
    currentCarouselData.theme = document.getElementById('selectTheme').value;
    renderActiveSlide();
  }
}

function loadSample(id) {
  const sample = SAMPLE_BOOKS[id];
  if (!sample) return;

  document.getElementById('inputTitle').value = sample.title;
  document.getElementById('inputAuthor').value = sample.author;
  document.getElementById('selectGenre').value = sample.genre;
  document.getElementById('inputReviewText').value = sample.review;
  document.getElementById('charCount').textContent = sample.review.length + ' caracteres';

  const previewImg = document.getElementById('coverPreviewImg');
  previewImg.src = sample.coverUrl;
  previewImg.classList.remove('hidden');
  document.getElementById('coverPlaceholder').classList.add('hidden');

  generateCarouselData(sample);
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const previewImg = document.getElementById('coverPreviewImg');
    previewImg.src = evt.target.result;
    previewImg.classList.remove('hidden');
    document.getElementById('coverPlaceholder').classList.add('hidden');
    if (currentCarouselData) {
      currentCarouselData.book.coverUrl = evt.target.result;
      renderActiveSlide();
    }
  };
  reader.readAsDataURL(file);
}

function switchTab(tab) {
  document.getElementById('viewPreview').classList.add('hidden');
  document.getElementById('viewEditor').classList.add('hidden');
  document.getElementById('viewSocial').classList.add('hidden');

  ['tabPreview', 'tabEditor', 'tabSocial'].forEach(t => {
    document.getElementById(t).className = "px-4 py-2 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-medium border border-transparent transition flex items-center gap-1.5";
  });

  if (tab === 'preview') {
    document.getElementById('viewPreview').classList.remove('hidden');
    document.getElementById('tabPreview').className = "px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5";
  } else if (tab === 'editor') {
    document.getElementById('viewEditor').classList.remove('hidden');
    document.getElementById('tabEditor').className = "px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5";
    loadEditorValues();
  } else if (tab === 'social') {
    document.getElementById('viewSocial').classList.remove('hidden');
    document.getElementById('tabSocial').className = "px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5";
  }
}

async function triggerGeneration() {
  const title = document.getElementById('inputTitle').value.trim();
  const author = document.getElementById('inputAuthor').value.trim();
  const review = document.getElementById('inputReviewText').value.trim();

  if (!title || !author || !review) {
    alert('Por favor completa el título, autor y reseña del libro.');
    return;
  }

  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const progressPercent = document.getElementById('progressPercent');

  progressContainer.classList.remove('hidden');
  progressBar.style.width = '20%';
  progressLabel.textContent = 'Enviando a Cloud LLM (Claude 3.5 Sonnet)...';
  progressPercent.textContent = '20%';

  await new Promise(r => setTimeout(r, 600));
  progressBar.style.width = '60%';
  progressLabel.textContent = 'Estructurando 5 diapositivas y extrayendo citas...';
  progressPercent.textContent = '60%';

  await new Promise(r => setTimeout(r, 600));
  progressBar.style.width = '88%';
  progressLabel.textContent = 'Generando plantillas visuales a 1080x1350 px...';
  progressPercent.textContent = '88%';

  await new Promise(r => setTimeout(r, 500));
  progressBar.style.width = '100%';
  progressLabel.textContent = '¡Carrusel completado!';
  progressPercent.textContent = '100%';

  generateCarouselData({
    title,
    author,
    genre: document.getElementById('selectGenre').value,
    review,
    coverUrl: document.getElementById('coverPreviewImg').src || ''
  });

  setTimeout(() => {
    progressContainer.classList.add('hidden');
    switchTab('preview');
  }, 400);
}

function generateCarouselData(bookData) {
  const theme = document.getElementById('selectTheme').value;
  const storeName = document.getElementById('cfgStoreName').value;
  const igHandle = document.getElementById('cfgIgHandle').value;
  const primaryColor = document.getElementById('cfgPrimaryColor').value;
  const accentColor = document.getElementById('cfgAccentColor').value;

  currentCarouselData = {
    book: bookData,
    theme: theme,
    bookstore: {
      name: storeName,
      instagramHandle: igHandle,
      primaryColor,
      accentColor
    },
    caption: `✨ ¿Buscas tu próxima gran obsesión literaria? Hoy te recomendamos "${bookData.title}" de ${bookData.author}.\n\n📖 Desliza en este carrusel para descubrir la premisa sin spoilers, la cita más conmovedora y por qué es una lectura imprescindible este mes.\n\n📍 Disponible en stock físico en nuestra librería. Escríbenos por DM para reservar tu ejemplar o solicitar envío a todo el país.\n\n¿Ya lo leíste? ¡Déjanos tu opinión en los comentarios! 👇`,
    hashtags: ["#librosrecomendados", "#bookstagram", "#leoyrecomiendo", "#reseñadelibros", "#amoleer", `#${bookData.title.replace(/\s+/g, '').toLowerCase()}`, "#libreria"],
    slides: [
      {
        type: "cover_hook",
        title: "¿POR QUÉ TODOS ESTÁN HABLANDO DE ESTE LIBRO?",
        subtitle: "Análisis y reseña sin spoilers",
        body: ""
      },
      {
        type: "quote",
        title: "CITA DESTACADA",
        subtitle: "Frase memorable de la obra",
        quote: bookData.quote || (bookData.review.length > 80 ? `"${bookData.review.substring(0, 120)}..."` : `"${bookData.review}"`)
      },
      {
        type: "synopsis",
        title: "LA PREMISA EN BREVE",
        subtitle: "El conflicto principal",
        body: bookData.review.substring(0, 240)
      },
      {
        type: "highlights",
        title: "¿POR QUÉ DEBERÍAS LEERLO?",
        subtitle: "El veredicto de nuestra librería",
        body: "Una narrativa magnética con personajes inolvidables. Si buscas una lectura que te envuelva y no te suelte, esta es una recomendación garantizada."
      },
      {
        type: "cta",
        title: "¿LISTO PARA TU PRÓXIMA LECTURA?",
        subtitle: "Ejemplares disponibles en tienda",
        body: `Pídelo hoy en ${storeName} con envío directo a tu hogar o visítanos.`
      }
    ]
  };

  currentSlideIdx = 0;
  renderActiveSlide();
  renderSocialTab();
}

function renderActiveSlide() {
  if (!currentCarouselData) return;

  const slide = currentCarouselData.slides[currentSlideIdx];
  const book = currentCarouselData.book;
  const store = currentCarouselData.bookstore;
  const totalSlides = currentCarouselData.slides.length;
  const isPortrait = activeAspectRatio === '4:5';

  const width = 1080;
  const height = isPortrait ? 1350 : 1080;

  let bg = '#FDFBF7';
  let textColor = '#0F172A';
  let mutedColor = '#64748B';
  let surfaceColor = '#FFFFFF';
  let accent = store.accentColor || '#EA580C';
  let primary = store.primaryColor || '#1E293B';

  if (currentCarouselData.theme === 'dark_atmosphere') {
    bg = '#0B0F19';
    textColor = '#F8FAFC';
    mutedColor = '#94A3B8';
    surfaceColor = '#1E293B';
  }

  let innerContent = '';

  if (slide.type === 'cover_hook') {
    innerContent = `
      <g transform="translate(80, 100)">
        <rect x="0" y="0" width="280" height="42" rx="21" fill="${accent}" opacity="0.15" />
        <text x="140" y="27" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="2">RECOMENDACIÓN</text>
      </g>
      <text x="80" y="230" font-family="'Playfair Display', serif" font-size="52" font-weight="800" fill="${textColor}">
        ${escapeHtml(slide.title)}
      </text>
      <text x="80" y="300" font-family="'Inter', sans-serif" font-size="26" fill="${mutedColor}">
        ${escapeHtml(slide.subtitle)}
      </text>
      
      <g transform="translate(${width / 2 - 190}, 420)">
        <rect x="15" y="15" width="350" height="510" rx="16" fill="#000000" opacity="0.25" filter="blur(15px)" />
        ${book.coverUrl ? `
          <clipPath id="cvClip"><rect x="0" y="0" width="380" height="530" rx="14" /></clipPath>
          <image href="${escapeHtml(book.coverUrl)}" x="0" y="0" width="380" height="530" preserveAspectRatio="xMidYMid slice" clip-path="url(#cvClip)" />
        ` : `
          <rect x="0" y="0" width="380" height="530" rx="14" fill="${primary}" />
          <text x="190" y="260" font-family="'Playfair Display', serif" font-size="32" font-weight="700" fill="#fff" text-anchor="middle">${escapeHtml(book.title)}</text>
        `}
      </g>

      <g transform="translate(80, ${height - 220})">
        <text x="0" y="0" font-family="'Playfair Display', serif" font-size="34" font-weight="700" fill="${primary}">${escapeHtml(book.title)}</text>
        <text x="0" y="36" font-family="'Inter', sans-serif" font-size="22" fill="${mutedColor}">de ${escapeHtml(book.author)}</text>
      </g>
    `;
  } else if (slide.type === 'quote') {
    innerContent = `
      <g transform="translate(80, 100)">
        <rect x="0" y="0" width="220" height="42" rx="21" fill="${accent}" opacity="0.15" />
        <text x="110" y="27" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="2">CITA DESTACADA</text>
      </g>
      <text x="70" y="320" font-family="'Playfair Display', serif" font-size="220" font-weight="900" fill="${accent}" opacity="0.18">“</text>
      
      <rect x="70" y="300" width="${width - 140}" height="560" rx="28" fill="${surfaceColor}" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.2" />
      
      <foreignObject x="110" y="360" width="${width - 220}" height="400">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Playfair Display',serif; font-size:40px; font-style:italic; font-weight:600; color:${textColor}; line-height:1.4;">
          ${escapeHtml(slide.quote || slide.body)}
        </div>
      </foreignObject>

      <g transform="translate(110, 780)">
        <line x1="0" y1="0" x2="60" y2="0" stroke="${accent}" stroke-width="4" />
        <text x="80" y="8" font-family="'Inter', sans-serif" font-size="26" font-weight="700" fill="${primary}">${escapeHtml(book.title)}</text>
        <text x="80" y="38" font-family="'Inter', sans-serif" font-size="20" fill="${mutedColor}">${escapeHtml(book.author)}</text>
      </g>
    `;
  } else if (slide.type === 'synopsis') {
    innerContent = `
      <g transform="translate(80, 100)">
        <rect x="0" y="0" width="180" height="42" rx="21" fill="${accent}" opacity="0.15" />
        <text x="90" y="27" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="2">LA PREMISA</text>
      </g>
      <text x="80" y="220" font-family="'Playfair Display', serif" font-size="50" font-weight="800" fill="${textColor}">${escapeHtml(slide.title)}</text>
      
      <rect x="70" y="290" width="${width - 140}" height="640" rx="26" fill="${surfaceColor}" stroke="${primary}" stroke-width="1" stroke-opacity="0.1" />
      
      <foreignObject x="110" y="350" width="${width - 220}" height="420">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Inter',sans-serif; font-size:32px; font-weight:400; color:${textColor}; line-height:1.6;">
          ${escapeHtml(slide.body)}
        </div>
      </foreignObject>

      <g transform="translate(110, 830)">
        <rect x="0" y="0" width="220" height="46" rx="23" fill="${primary}" opacity="0.1" />
        <text x="110" y="30" font-family="'Inter', sans-serif" font-size="20" font-weight="600" fill="${primary}" text-anchor="middle">📖 Gran Narrativa</text>
        <rect x="240" y="0" width="240" height="46" rx="23" fill="${accent}" opacity="0.15" />
        <text x="360" y="30" font-family="'Inter', sans-serif" font-size="20" font-weight="700" fill="${accent}" text-anchor="middle">⚡ Ritmo Imparable</text>
      </g>
    `;
  } else if (slide.type === 'highlights') {
    innerContent = `
      <g transform="translate(80, 100)">
        <rect x="0" y="0" width="180" height="42" rx="21" fill="${accent}" opacity="0.15" />
        <text x="90" y="27" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="2">VEREDICTO</text>
      </g>
      <text x="80" y="220" font-family="'Playfair Display', serif" font-size="50" font-weight="800" fill="${textColor}">${escapeHtml(slide.title)}</text>
      
      <rect x="70" y="290" width="${width - 140}" height="640" rx="26" fill="${surfaceColor}" stroke="${accent}" stroke-width="2" stroke-opacity="0.2" />
      
      <g transform="translate(110, 370)">
        <text x="0" y="0" font-family="'Inter', sans-serif" font-size="44" fill="#F59E0B">★★★★★</text>
        <text x="190" y="-8" font-family="'Inter', sans-serif" font-size="26" font-weight="700" fill="${primary}">5/5 Muy Recomendado</text>
      </g>

      <foreignObject x="110" y="440" width="${width - 220}" height="400">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Inter',sans-serif; font-size:32px; font-weight:400; color:${textColor}; line-height:1.6;">
          ${escapeHtml(slide.body)}
        </div>
      </foreignObject>
    `;
  } else {
    innerContent = `
      <g transform="translate(80, 100)">
        <rect x="0" y="0" width="260" height="42" rx="21" fill="${accent}" opacity="0.15" />
        <text x="130" y="27" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="2">DISPONIBLE EN TIENDA</text>
      </g>
      
      <g transform="translate(80, 260)">
        <rect x="0" y="0" width="${width - 160}" height="620" rx="30" fill="${surfaceColor}" stroke="${accent}" stroke-width="2" stroke-opacity="0.25" />
        
        <circle cx="${(width - 160) / 2}" cy="110" r="54" fill="${accent}" opacity="0.12" />
        <text x="${(width - 160) / 2}" y="125" font-size="48" text-anchor="middle">📚</text>
        
        <text x="${(width - 160) / 2}" y="220" font-family="'Playfair Display', serif" font-size="42" font-weight="800" fill="${primary}" text-anchor="middle">
          ${escapeHtml(store.name)}
        </text>
        <text x="${(width - 160) / 2}" y="270" font-family="'Inter', sans-serif" font-size="24" fill="${mutedColor}" text-anchor="middle">
          Ejemplares disponibles en tienda física y envíos
        </text>

        <rect x="${(width - 160) / 2 - 240}" y="350" width="480" height="80" rx="40" fill="${accent}" />
        <text x="${(width - 160) / 2}" y="400" font-family="'Inter', sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" text-anchor="middle">
          PÍDELO POR MENSAJE DIRECTO
        </text>

        <text x="${(width - 160) / 2}" y="500" font-family="'Inter', sans-serif" font-size="22" font-weight="600" fill="${primary}" text-anchor="middle">
          O encuéntranos en ${escapeHtml(store.instagramHandle)}
        </text>
      </g>
    `;
  }

  const footerSvg = `
    <g transform="translate(80, ${height - 90})">
      <line x1="0" y1="0" x2="${width - 160}" y2="0" stroke="${accent}" stroke-width="2" opacity="0.3" />
      <text x="0" y="40" font-family="'Inter', sans-serif" font-size="22" font-weight="700" fill="${primary}">${escapeHtml(store.name.toUpperCase())}</text>
      <text x="0" y="66" font-family="'Inter', sans-serif" font-size="18" fill="${mutedColor}">${escapeHtml(store.instagramHandle)}</text>
      
      <rect x="${width - 270}" y="15" width="110" height="42" rx="21" fill="${accent}" opacity="0.15" />
      <text x="${width - 215}" y="42" font-family="'Inter', sans-serif" font-size="20" font-weight="700" fill="${accent}" text-anchor="middle">
        ${currentSlideIdx + 1} / ${totalSlides} ${currentSlideIdx + 1 < totalSlides ? '→' : '✓'}
      </text>
    </g>
  `;

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${bg}" />
      ${innerContent}
      ${footerSvg}
    </svg>
  `;

  document.getElementById('slideContent').innerHTML = fullSvg;
  document.getElementById('slideIndexLabel').textContent = `Diapositiva ${currentSlideIdx + 1} de ${totalSlides}`;

  const dots = document.getElementById('dotsContainer').children;
  for (let i = 0; i < dots.length; i++) {
    if (i === currentSlideIdx) {
      dots[i].className = "w-3 h-3 rounded-full bg-orange-500";
    } else {
      dots[i].className = "w-3 h-3 rounded-full bg-slate-700 hover:bg-slate-500";
    }
  }
}

function prevSlide() {
  if (!currentCarouselData) return;
  currentSlideIdx = (currentSlideIdx - 1 + currentCarouselData.slides.length) % currentCarouselData.slides.length;
  renderActiveSlide();
  loadEditorValues();
}

function nextSlide() {
  if (!currentCarouselData) return;
  currentSlideIdx = (currentSlideIdx + 1) % currentCarouselData.slides.length;
  renderActiveSlide();
  loadEditorValues();
}

function goToSlide(idx) {
  if (!currentCarouselData) return;
  currentSlideIdx = idx;
  renderActiveSlide();
  loadEditorValues();
}

function loadEditorValues() {
  if (!currentCarouselData) return;
  const slide = currentCarouselData.slides[currentSlideIdx];
  document.getElementById('editorSlideNum').textContent = currentSlideIdx + 1;
  document.getElementById('editTitle').value = slide.title || '';
  document.getElementById('editSubtitle').value = slide.subtitle || '';
  document.getElementById('editBody').value = slide.body || slide.quote || '';
}

function updateActiveSlideContent() {
  if (!currentCarouselData) return;
  const slide = currentCarouselData.slides[currentSlideIdx];
  slide.title = document.getElementById('editTitle').value;
  slide.subtitle = document.getElementById('editSubtitle').value;
  if (slide.type === 'quote') {
    slide.quote = document.getElementById('editBody').value;
  } else {
    slide.body = document.getElementById('editBody').value;
  }
  renderActiveSlide();
}

function renderSocialTab() {
  if (!currentCarouselData) return;
  document.getElementById('captionBox').value = currentCarouselData.caption;

  const container = document.getElementById('hashtagsContainer');
  container.innerHTML = '';
  currentCarouselData.hashtags.forEach(tag => {
    const span = document.createElement('span');
    span.className = "text-xs bg-slate-800 text-orange-400 border border-slate-700 px-2.5 py-1 rounded-full";
    span.textContent = tag;
    container.appendChild(span);
  });
}

function copyCaption() {
  const text = document.getElementById('captionBox').value;
  navigator.clipboard.writeText(text).then(() => {
    const fb = document.getElementById('copyFeedback');
    fb.textContent = '✓ ¡Copiado!';
    setTimeout(() => fb.textContent = '📋 Copiar Texto', 2000);
  });
}

function publishCarousel() {
  if (!currentCarouselData) return;
  const btn = document.getElementById('btnPublish');
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Publicando en Meta Graph API...</span>';

  setTimeout(() => {
    btn.innerHTML = '<span>✓ ¡Publicado con éxito en Instagram!</span>';
    btn.className = "flex-1 py-2.5 px-4 bg-emerald-700 text-white font-semibold rounded-xl text-xs";
    
    alert(`¡Carrusel de "${currentCarouselData.book.title}" publicado exitosamente en Instagram! 🎉`);
    
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalText;
      btn.className = "flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2";
    }, 3000);
  }, 1500);
}

function downloadCurrentSlide() {
  const svgElement = document.getElementById('slideContent').querySelector('svg');
  if (!svgElement) return;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `carrusel-slide-${currentSlideIdx + 1}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
