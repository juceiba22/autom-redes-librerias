# 📚 LibrerIA Studio: Automatización de Reseñas a Carruseles de Redes Sociales

> Plataforma en la nube para librerías que transforma reseñas y portadas de libros en carruseles de Instagram profesionales (1080x1350 px, formato 4:5), orquestado con **n8n**, impulsado por **Cloud LLM (Claude 3.5 Sonnet)**, renderizado con un motor visual dedicado y desplegado en **Railway**.

---

## 🏛️ Estructura del Repositorio

```
book-carousel-automation/
├── database/
│   └── schema.sql              # Esquema PostgreSQL completo (librerías, libros, reseñas, carruseles, slides)
├── renderer/
│   ├── src/
│   │   ├── colorExtractor.js   # Extractor de paleta cromática inteligente a partir de la portada
│   │   ├── templates.js        # Generador de plantillas SVG editoriales (Clásico, Bold, Dark Atmosphere)
│   │   ├── renderer.js         # Motor de renderizado a PNG ultra-alta definición con Sharp
│   │   └── server.js           # Microservicio REST Express con endpoints para Railway
│   ├── Dockerfile              # Contenedor optimizado para Railway (Node + librsvg)
│   └── package.json
├── n8n-workflows/
│   ├── generate-book-carousel.json     # Workflow n8n 1: Webhook -> Gemini LLM -> Renderer -> DB
│   └── publish-instagram-carousel.json # Workflow n8n 2: Meta Graph API -> Carousel Containers -> Publish
├── frontend/
│   ├── public/
│   │   ├── index.html          # Panel comercial para librerías (Carga, Preview interactivo, Editor)
│   │   └── app.js              # Lógica cliente, presets de libros y motor gráfico interactivo
│   ├── server.js               # Servidor ligero Node.js para servir el frontend
│   ├── Dockerfile              # Contenedor para Railway
│   └── package.json
├── docker-compose.yml          # Despliegue multi-contenedor para pruebas completas
├── railway.json                # Configuración de despliegue en Railway
└── .env.example                # Plantilla de variables de entorno
```

---

## 🚀 Despliegue en Railway (Paso a Paso)

### 1. Crear el Proyecto en Railway
1. Ingresa a [Railway.app](https://railway.app/) y crea un nuevo proyecto: **"New Project"**.

### 2. Añadir la Base de Datos PostgreSQL
1. En tu proyecto de Railway, haz clic en **New** -> **Database** -> **Add PostgreSQL**.
2. Una vez aprovisionada, ve a la pestaña **Data** o conéctate vía psql/DBeaver y ejecuta el script:
   `database/schema.sql`.
   *Esto creará las tablas `bookstores`, `books`, `reviews`, `carousels` y `carousel_slides` con índices y datos demo.*

### 3. Desplegar n8n en Railway
1. En Railway, haz clic en **New** -> **Docker Image**.
2. Escribe la imagen oficial: `docker.n8n.io/n8nio/n8n:latest`.
3. En la pestaña **Variables**, vincula las siguientes:
   - `DB_TYPE`: `postgresdb`
   - `DB_POSTGRESDB_HOST`: `${{Postgres.PGHOST}}`
   - `DB_POSTGRESDB_PORT`: `${{Postgres.PGPORT}}`
   - `DB_POSTGRESDB_DATABASE`: `${{Postgres.PGDATABASE}}`
   - `DB_POSTGRESDB_USER`: `${{Postgres.PGUSER}}`
   - `DB_POSTGRESDB_PASSWORD`: `${{Postgres.PGPASSWORD}}`
   - `N8N_PORT`: `5678`
   - `WEBHOOK_URL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}/`
   - `RENDERER_URL`: `http://${{renderer.RAILWAY_PRIVATE_DOMAIN}}:3001`
4. Genera un dominio público para acceder a la interfaz de n8n.
5. Abre n8n e importa los dos flujos ubicados en la carpeta `n8n-workflows/`:
   - `generate-book-carousel.json`
   - `publish-instagram-carousel.json`

### 4. Desplegar el Microservicio de Renderizado
1. Haz clic en **New** -> **GitHub Repo** y selecciona la carpeta `renderer`.
2. Railway detectará automáticamente el `Dockerfile`.
3. El puerto por defecto es `3001`. Puedes exponer una red privada para que n8n se comunique internamente a costo cero.

### 5. Desplegar el Frontend Web Comercial
1. Haz clic en **New** -> **GitHub Repo** y selecciona la carpeta `frontend`.
2. Genera un dominio público (ej. `libreria-studio.up.railway.app`).
3. ¡Listo! Cualquier cliente o librero puede entrar desde la web para cargar reseñas y ver los carruseles generados.

---

## 💻 Pruebas en Entorno Local

Si deseas probar el frontend o el motor de renderizado en tu máquina:

### Opción A: Probar el Frontend de Inmediato
```powershell
cd frontend
npm start
# Abrir en el navegador: http://localhost:3000
```
*El frontend incluye 3 libros de prueba con un clic ("Cien años de soledad", "Hábitos Atómicos" y "La Sombra del Viento") y permite ver cómo se construye el carrusel de 5 diapositivas en tiempo real.*

### Opción B: Probar el Motor de Renderizado
```powershell
cd renderer
node test-render.js
# Generará 'test-slide-1.png' a 1080x1350 px comprobando que Sharp y las fuentes funcionan.
```

### Opción C: Todo el stack con Docker Compose
```bash
docker-compose up --build
```

---

## 📱 Conexión con Instagram (Meta Graph API)

Para publicar automáticamente carruseles en Instagram:
1. Asegúrate de tener una cuenta de **Instagram Profesional / Empresa** vinculada a una **Página de Facebook**.
2. En [Meta for Developers](https://developers.facebook.com/), crea una App con el caso de uso de **Instagram Graph API**.
3. Obtén un **Token de Acceso de Larga Duración (User Access Token)** con los permisos:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
4. Configura estos valores en el modal de la librería o en las credenciales de n8n.

---

## 🎨 Tipos de Diapositivas Generadas por la IA

| Slide # | Tipo | Objetivo de Marketing Editorial |
| :--- | :--- | :--- |
| **Slide 1** | `cover_hook` | Pregunta o gancho magnético + maqueta de la portada con sombra 3D |
| **Slide 2** | `quote` | Cita literaria de alto impacto con comillas gigantes y cita del autor |
| **Slide 3** | `synopsis` | La premisa y conflicto central sin spoilers |
| **Slide 4** | `highlights` | El veredicto de la librería con estrellas de valoración y público objetivo |
| **Slide 5** | `cta` | Llamada a la acción clara para pedir el libro por DM o visitar la tienda |
