const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'book-carousel-frontend' });
});

app.listen(PORT, () => {
  console.log(`[Frontend] Portal de Librerías activo en http://localhost:${PORT}`);
});
