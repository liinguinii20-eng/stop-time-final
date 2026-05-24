import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Importar configuración y middlewares
import supabase from './config/supabase.js';
import { requireAuth, requireAdmin } from './middlewares/auth.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import platosRoutes from './routes/platos.js';
import recetasRoutes from './routes/recetas.js';
import usuariosRoutes from './routes/usuarios.js';
import personalRoutes from './routes/personal.js';
import ingredientesRoutes from './routes/ingredientes.js';
import alertasRoutes from './routes/alertas.js';
import ventasRoutes from './routes/ventas.js';
import comandasRoutes from './routes/comandas.js';
import syncRoutes from './routes/sync.js';
import gastosRoutes from './routes/gastos.js';
import adelantosRoutes from './routes/adelantos.js';
import categoriasGastoRoutes from './routes/categoriasGasto.js';
import tasasCambioRoutes from './routes/tasasCambio.js';
import recetasPrimariasRoutes from './routes/recetasPrimarias.js';
import recetasSecundariasRoutes from './routes/recetasSecundarias.js';
import detalleRecetasPrimariasRoutes from './routes/detalleRecetasPrimarias.js';
import detalleRecetasSecundariasRoutes from './routes/detalleRecetasSecundarias.js';
import pagosMixtosRoutes from './routes/pagosMixtos.js';
import mantenimientoRoutes from './routes/mantenimiento.js';
import cuentasPorCobrarRoutes from './routes/cuentasPorCobrar.js';
import pagosCuentasRoutes from './routes/pagosCuentas.js';
import cierreTrimestralRoutes from './routes/cierreTrimestral.js';
import { addClient } from './services/cocinaEvents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "https://base44.com"],
    },
  },
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', // En producción especificar dominios
  credentials: true
}));
app.use(express.json());

// Rate limiting para el login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Limitar cada IP a 15 intentos de login por ventana
  message: { error: 'Demasiados intentos de login, por favor intente de nuevo en 15 minutos' }
});

// Registrar rutas
app.use('/api/auth/login', loginLimiter); // Aplicar solo al login para seguridad
app.use('/api/auth', authRoutes);
app.use('/api/platos', platosRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/alertastocks', alertasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/comandas', comandasRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/adelantos', adelantosRoutes);
app.use('/api/categorias-gasto', categoriasGastoRoutes);
app.use('/api/tasas-cambio', tasasCambioRoutes);
app.use('/api/recetaprimarias', recetasPrimariasRoutes);
app.use('/api/recetasecundarias', recetasSecundariasRoutes);
app.use('/api/detallerecetaprimarias', detalleRecetasPrimariasRoutes);
app.use('/api/detallerecetasecundarias', detalleRecetasSecundariasRoutes);
app.use('/api/pagomixtos', pagosMixtosRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);
app.use('/api/cuentaporcobrars', cuentasPorCobrarRoutes);
app.use('/api/pagocuentaporcobrars', pagosCuentasRoutes);
app.use('/api/cierre-trimestral', cierreTrimestralRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// === SSE: Stream en tiempo real para la cocina ===
// EventSource no soporta headers → acepta token via query param o Authorization header
app.get('/api/cocina/stream', (req, res) => {
  // Inyectar token de query param al header para reutilizar requireAuth
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }

  requireAuth(req, res, () => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    // Heartbeat cada 30s para mantener la conexión abierta
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);
    res.on('close', () => clearInterval(heartbeat));
    addClient(res);
  });
});

// === ADMIN ENDPOINTS (solo lectura, sin eliminación) ===
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const getData = async (tableName) => {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(100);
        if (error) return { error: error.message, count: 0, data: [] };
        return { count: data.length, data };
      } catch (e) {
        return { error: e.message, count: 0, data: [] };
      }
    };
    
    const [ventas, comandas, gastos, pagosMixtos, cuentasPorCobrar, empleados, platos, ingredientes, compras, adelantos, alertas, usuarios] = await Promise.all([
      getData('Venta'),
      getData('Comanda'),
      getData('Gasto'),
      getData('PagoMixto'),
      getData('CuentaPorCobrar'),
      getData('Empleado'),
      getData('Plato'),
      getData('Ingrediente'),
      getData('Compra'),
      getData('Adelanto'),
      getData('AlertaStock'),
      getData('Usuario')
    ]);
    
    res.json({ ventas, comandas, gastos, pagosMixtos, cuentasPorCobrar, empleados, platos, ingredientes, compras, adelantos, alertas, usuarios });
  } catch (e) {
    console.error('Admin stats error', e);
    res.status(500).json({ error: e.message });
  }
});

// Servir el build de producción de Vite (dist/)
const distPath = path.join(__dirname, '..', 'dist');
const distExists = fs.existsSync(distPath);

if (distExists) {
  app.use(express.static(distPath));
  
  // Catch-all para SPA: solo para rutas que NO son /api/*
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.json({ 
      message: 'API Server Running', 
      hint: 'Run "npm run build" to build the frontend or "npm run dev" for development',
      endpoints: ['/api/health', '/api/auth/login', '/api/comandas', '/api/ventas']
    });
  });
}

const port = process.env.PORT || 4000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});
