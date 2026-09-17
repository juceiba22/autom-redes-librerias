-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: BOOK CAROUSEL AUTOMATION
-- Optimizado para PostgreSQL en Railway
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Librerías (Tenants / Clientes)
CREATE TABLE IF NOT EXISTS bookstores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    instagram_handle VARCHAR(100) NOT NULL,
    website_url VARCHAR(255),
    logo_url TEXT,
    brand_primary_color VARCHAR(7) DEFAULT '#2D3748',
    brand_accent_color VARCHAR(7) DEFAULT '#E53E3E',
    
    -- Credenciales de Meta Graph API para publicación directa
    meta_access_token TEXT,
    meta_page_id VARCHAR(100),
    meta_ig_user_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Libros
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bookstore_id UUID REFERENCES bookstores(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(30),
    genre VARCHAR(100) NOT NULL DEFAULT 'General',
    cover_image_url TEXT NOT NULL,
    synopsis TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Reseñas de Libros
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    bookstore_id UUID NOT NULL REFERENCES bookstores(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    reviewer_name VARCHAR(150) DEFAULT 'Equipo de Librería',
    rating INT CHECK (rating >= 1 AND rating <= 5),
    key_quote TEXT,
    source VARCHAR(100) DEFAULT 'Manual Librería',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Carruseles Generados
CREATE TABLE IF NOT EXISTS carousels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    bookstore_id UUID NOT NULL REFERENCES bookstores(id) ON DELETE CASCADE,
    
    -- Estado del ciclo de vida
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'generating', 'ready_for_review', 'approved', 'publishing', 'published', 'failed')),
    
    -- Configuración estética y de plantilla
    theme_template VARCHAR(50) NOT NULL DEFAULT 'editorial_classic'
        CHECK (theme_template IN ('editorial_classic', 'modern_bold', 'dark_atmosphere', 'minimal_poetry')),
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '4:5' CHECK (aspect_ratio IN ('4:5', '1:1')),
    
    -- Paleta de colores extraída de la portada del libro
    palette_primary VARCHAR(7) DEFAULT '#1A202C',
    palette_secondary VARCHAR(7) DEFAULT '#EDF2F7',
    palette_accent VARCHAR(7) DEFAULT '#DD6B20',
    
    -- Contenido textual para redes sociales
    caption TEXT,
    hashtags TEXT[],
    
    -- Metadatos de publicación en Instagram
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    instagram_creation_id VARCHAR(100),
    instagram_post_url TEXT,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Diapositivas (Slides) Individuales del Carrusel
CREATE TABLE IF NOT EXISTS carousel_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
    slide_number INT NOT NULL,
    slide_type VARCHAR(50) NOT NULL 
        CHECK (slide_type IN ('cover_hook', 'quote', 'synopsis', 'highlights', 'cta')),
    
    -- Contenido textual de la diapositiva
    title VARCHAR(255),
    subtitle VARCHAR(255),
    body_text TEXT,
    highlight_text TEXT,
    
    -- Recursos visuales
    rendered_image_url TEXT,
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(carousel_id, slide_number)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_books_bookstore ON books(bookstore_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_carousels_status ON carousels(status);
CREATE INDEX IF NOT EXISTS idx_carousel_slides_carousel ON carousel_slides(carousel_id);

-- Datos iniciales de prueba (Seed Demo)
INSERT INTO bookstores (id, name, slug, instagram_handle, website_url, brand_primary_color, brand_accent_color)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Librería El Ateneo Literario',
    'ateneo-literario',
    '@ateneoliterario',
    'https://ateneoliterario.com',
    '#2C3E50',
    '#C0392B'
) ON CONFLICT (slug) DO NOTHING;
