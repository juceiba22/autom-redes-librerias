const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handlers de la API compartida
let generateHandler = null;
let uploadHandler = null;

try {
  generateHandler = require('../api/generate.js');
} catch (e) {
  console.warn('api/generate.js no disponible:', e.message);
}

try {
  uploadHandler = require('../api/upload.js');
} catch (e) {
  console.warn('api/upload.js no disponible:', e.message);
}

if (generateHandler) {
  app.all('/api/generate', (req, res) => generateHandler(req, res));
}

if (uploadHandler) {
  app.all('/api/upload', (req, res) => uploadHandler(req, res));
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'book-carousel-frontend',
    hasClaudeApiKey: Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)
  });
});

app.listen(PORT, () => {
  console.log(`[Frontend] Portal de Librerías activo en http://localhost:${PORT}`);
});
