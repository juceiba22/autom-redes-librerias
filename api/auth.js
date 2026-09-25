const fs = require('fs');
const path = require('path');

const DEFAULT_USERS = [
  {
    username: "admin",
    password: "leonardo2025",
    name: "Administrador Leonardo",
    role: "admin",
    storeName: "Casa Central - Av. Corrientes",
    storeHandle: "@librerias_central"
  },
  {
    username: "demo",
    password: "demo2025",
    name: "Cliente Demo",
    role: "client",
    storeName: "Librería Palermo Soho",
    storeHandle: "@libreria_demo"
  },
  {
    username: "ateneo",
    password: "ateneo2025",
    name: "Librería El Ateneo",
    role: "client",
    storeName: "El Ateneo Grand Splendid",
    storeHandle: "@elateneoliterario"
  },
  {
    username: "cuspide",
    password: "cuspide2025",
    name: "Librería Cúspide",
    role: "client",
    storeName: "Cúspide Libros",
    storeHandle: "@cuspidelibros"
  },
  {
    username: "hernandez",
    password: "hernandez2025",
    name: "Librería Hernández",
    role: "client",
    storeName: "Librería Hernández",
    storeHandle: "@libreriahernandez"
  }
];

function getUsersFilePath() {
  const possiblePaths = [
    path.join(__dirname, '..', 'users.json'),
    path.join(process.cwd(), 'users.json'),
    path.join(__dirname, 'users.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '..', 'users.json');
}

function loadUsers() {
  try {
    const filePath = getUsersFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[api/auth] Error leyendo users.json:', err.message);
  }
  return [...DEFAULT_USERS];
}

function saveUsers(users) {
  try {
    const filePath = getUsersFilePath();
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('[api/auth] No se pudo persistir users.json (entorno de sólo lectura):', err.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const users = loadUsers();
    // Devolvemos lista pública de usuarios sin contraseñas
    const safeUsers = users.map(u => ({
      username: u.username,
      name: u.name,
      role: u.role,
      storeName: u.storeName,
      storeHandle: u.storeHandle
    }));
    return res.status(200).json({
      status: 'ok',
      service: 'Leonardo Auth API',
      users: safeUsers
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    const { action = 'login', username, password, newUser } = req.body || {};
    const users = loadUsers();

    // 1. ACCIÓN: LOGIN
    if (action === 'login') {
      const safeUsername = (username || '').trim().toLowerCase();
      const safePassword = (password || '').trim();

      if (!safeUsername || !safePassword) {
        return res.status(400).json({ error: 'Debes ingresar usuario y contraseña.' });
      }

      const foundUser = users.find(u => 
        (u.username || '').toLowerCase() === safeUsername && 
        String(u.password) === safePassword
      );

      if (!foundUser) {
        return res.status(401).json({
          success: false,
          error: 'Usuario o contraseña incorrectos. Verifica tus datos de acceso.'
        });
      }

      // Login exitoso: Devolver datos del usuario (sin contraseña)
      return res.status(200).json({
        success: true,
        user: {
          username: foundUser.username,
          name: foundUser.name,
          role: foundUser.role || 'client',
          storeName: foundUser.storeName || 'Librería Asociada',
          storeHandle: foundUser.storeHandle || '@libreria',
          token: 'auth_' + Buffer.from(`${foundUser.username}:${Date.now()}`).toString('base64')
        }
      });
    }

    // 2. ACCIÓN: CREAR USUARIO (Para que el admin pueda generar clientes)
    if (action === 'create') {
      if (!newUser || !newUser.username || !newUser.password) {
        return res.status(400).json({ error: 'El nuevo usuario requiere al menos "username" y "password".' });
      }

      const cleanUsername = newUser.username.trim().toLowerCase();
      const existing = users.find(u => (u.username || '').toLowerCase() === cleanUsername);
      if (existing) {
        return res.status(409).json({ error: `El usuario "${cleanUsername}" ya existe.` });
      }

      const created = {
        username: cleanUsername,
        password: String(newUser.password).trim(),
        name: newUser.name ? newUser.name.trim() : `Cliente ${cleanUsername}`,
        role: newUser.role || 'client',
        storeName: newUser.storeName ? newUser.storeName.trim() : 'Librería Cliente',
        storeHandle: newUser.storeHandle ? newUser.storeHandle.trim() : `@${cleanUsername}`
      };

      users.push(created);
      const saved = saveUsers(users);

      return res.status(201).json({
        success: true,
        savedOnDisk: saved,
        user: {
          username: created.username,
          name: created.name,
          role: created.role,
          storeName: created.storeName,
          storeHandle: created.storeHandle
        }
      });
    }

    // 3. ACCIÓN: LISTAR USUARIOS (para gestión administrativa)
    if (action === 'list') {
      const safeUsers = users.map(u => ({
        username: u.username,
        name: u.name,
        role: u.role,
        storeName: u.storeName,
        storeHandle: u.storeHandle
      }));
      return res.status(200).json({ success: true, users: safeUsers });
    }

    return res.status(400).json({ error: `Acción "${action}" no reconocida.` });

  } catch (err) {
    console.error('Error en /api/auth:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor de autenticación.' });
  }
};
