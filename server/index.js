import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// === AUTH ENDPOINTS ===

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, rol } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
    }
    const existing = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        nombre,
        rol: rol || 'administrador',
      },
    });
    res.json({ id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol });
  } catch (e) {
    console.error('Register error', e);
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    if (!usuario.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }
    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    res.json({ id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol });
  } catch (e) {
    console.error('Login error', e);
    res.status(500).json({ error: e.message });
  }
});

// Get all users (for admin)
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true },
    });
    res.json(usuarios);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user (admin only)
app.put('/api/usuarios', async (req, res) => {
  try {
    const { id, email, password, nombre, rol, activo } = req.body;
    if (!id || !email || !nombre) {
      return res.status(400).json({ error: 'ID, email y nombre son requeridos' });
    }
    
    const updateData = {
      email: email.toLowerCase(),
      nombre,
      rol: rol || 'mesero',
      activo: activo !== false,
    };
    
    // Only update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
    });
    
    res.json({ id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol });
  } catch (e) {
    console.error('Update user error', e);
    res.status(500).json({ error: e.message });
  }
});

// ===

app.get('/api/platos', async (req, res) => {
  const platos = await prisma.plato.findMany();
  res.json(platos);
});

app.get('/api/ingredientes', async (req, res) => {
  const ings = await prisma.ingrediente.findMany();
  res.json(ings);
});

app.post('/api/ventas', async (req, res) => {
  try {
    const { total_venta, metodo_pago, detalles } = req.body;
    const venta = await prisma.venta.create({
      data: {
        total_venta,
        metodo_pago,
        detalles: {
          create: (detalles || []).map(d => ({
            platoId: d.plato_id || d.platoId || null,
            platoNombre: d.plato_nombre || d.platoNombre || null,
            cantidad: d.cantidad,
            precioUnitario: d.precio_unitario || d.precioUnitario || 0,
            subtotal: d.subtotal || 0
          }))
        }
      },
      include: { detalles: true }
    });
    res.json(venta);
  } catch (e) {
    console.error('Error creating venta', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint para sincronizar datos desde el frontend (bulk sync desde localStorage)
app.post('/api/sync', async (req, res) => {
  try {
    const payload = req.body || {};
    const entities = payload.entities || {};

    // helper para convertir nombres de entidad a propiedades de Prisma (camelCase)
    const toPrismaProp = (name) => {
      return name.charAt(0).toLowerCase() + name.slice(1);
    };

    const results = {};

    for (const [entityName, items] of Object.entries(entities)) {
      const prop = toPrismaProp(entityName);
      if (!prisma[prop]) {
        console.warn('Prisma model not found for', prop);
        continue;
      }

      results[entityName] = [];
      for (const item of items) {
        try {
          if (item.id) {
            // try upsert by id
            const up = await prisma[prop].upsert({
              where: { id: item.id },
              update: item,
              create: item
            });
            results[entityName].push(up);
          } else {
            const created = await prisma[prop].create({ data: item });
            results[entityName].push(created);
          }
        } catch (e) {
          console.warn('Error syncing item for', entityName, e.message);
        }
      }
    }

    res.json({ ok: true, results });
  } catch (e) {
    console.error('Sync error', e);
    res.status(500).json({ error: e.message });
  }
});

// Servir el build de producción de Vite (dist/)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});
