import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

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
