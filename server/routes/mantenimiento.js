import express from 'express';
import supabase from '../config/supabase.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * Obtiene un resumen de lo que se va a depurar (datos de hace más de 3 meses)
 */
router.get('/resumen-depuracion', requireAdmin, async (req, res) => {
  try {
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    const fechaLimite = tresMesesAtras.toISOString();

    // Consultar totales con metodo_pago para separar monedas
    const [ventas, gastos, comandas, adelantos] = await Promise.all([
      supabase.from('Venta').select('total_venta, metodo_pago, monto_original, moneda_original').lt('fecha_hora', fechaLimite).neq('estado', 'ARCHIVADO'),
      supabase.from('Gasto').select('monto, metodo_pago, monto_original, moneda_original').lt('fecha', fechaLimite).neq('estado', 'ARCHIVADO'),
      supabase.from('Comanda').select('total_comanda').lt('fecha_apertura', fechaLimite),
      supabase.from('Adelanto').select('monto, metodo_pago, monto_original, moneda_original').lt('fecha', fechaLimite).neq('estado', 'ARCHIVADO')
    ]);

    const esBs = (m) => m && m.endsWith('_bs');
    const esCOP = (m) => m && m.endsWith('_cop');
    const esUSD = (m) => !esBs(m) && !esCOP(m);

    // Ventas separadas
    const ventasData = ventas.data || [];
    const ventasUSD = ventasData.filter(v => esUSD(v.metodo_pago)).reduce((s, v) => s + (v.total_venta || 0), 0);
    const ventasBs = ventasData.filter(v => esBs(v.metodo_pago)).reduce((s, v) => s + (v.monto_original || v.total_venta || 0), 0);

    // Gastos separados
    const gastosData = gastos.data || [];
    const gastosUSD = gastosData.filter(g => esUSD(g.metodo_pago)).reduce((s, g) => s + (g.monto || 0), 0);
    const gastosBs = gastosData.filter(g => esBs(g.metodo_pago)).reduce((s, g) => s + (g.monto_original || g.monto || 0), 0);

    // Adelantos separados
    const adelantosData = adelantos.data || [];
    const adelantosUSD = adelantosData.filter(a => esUSD(a.metodo_pago)).reduce((s, a) => s + (a.monto || 0), 0);
    const adelantosBs = adelantosData.filter(a => esBs(a.metodo_pago)).reduce((s, a) => s + (a.monto_original || a.monto || 0), 0);

    const totalComandas = (comandas.data || []).reduce((acc, c) => acc + (c.total_comanda || 0), 0);

    res.json({
      fechaLimite,
      conteos: {
        ventas: ventasData.length,
        gastos: gastosData.length,
        comandas: comandas.data?.length || 0,
        adelantos: adelantosData.length
      },
      totales: {
        ventasUSD,
        ventasBs,
        gastosUSD,
        gastosBs,
        comandas: totalComandas,
        adelantosUSD,
        adelantosBs,
        utilidadUSD: ventasUSD - gastosUSD - adelantosUSD,
        utilidadBs: ventasBs - gastosBs - adelantosBs,
        // Legacy - para que no se rompa si algo usa los campos viejos
        ventas: ventasUSD,
        gastos: gastosUSD,
        adelantos: adelantosUSD,
        utilidadEstimada: ventasUSD - gastosUSD - adelantosUSD
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Ejecuta la depuración borrando los registros antiguos
 */
router.post('/ejecutar-depuracion', requireAdmin, async (req, res) => {
  try {
    const { fechaLimite } = req.body;
    if (!fechaLimite) return res.status(400).json({ error: 'Se requiere fechaLimite' });

    // 1. Borrar detalles primero (por integridad referencial si no hay cascade)
    // Nota: Dependiendo de tu configuración de Supabase/Postgres, 
    // podrías necesitar borrar DetalleVenta antes que Venta si no hay ON DELETE CASCADE.
    
    // Suponiendo que necesitamos borrar detalles manualmente:
    const { data: vIds } = await supabase.from('Venta').select('id').lt('fecha_hora', fechaLimite);
    if (vIds && vIds.length > 0) {
      await supabase.from('DetalleVenta').delete().in('ventaId', vIds.map(v => v.id));
    }

    const { data: cIds } = await supabase.from('Comanda').select('id').lt('fecha_apertura', fechaLimite);
    if (cIds && cIds.length > 0) {
      await supabase.from('DetalleComanda').delete().in('comandaId', cIds.map(c => c.id));
    }

    // 2. Borrar maestros
    const results = await Promise.all([
      supabase.from('Venta').delete().lt('fecha_hora', fechaLimite),
      supabase.from('Gasto').delete().lt('fecha', fechaLimite),
      supabase.from('Comanda').delete().lt('fecha_apertura', fechaLimite),
      supabase.from('Adelanto').delete().lt('fecha', fechaLimite),
      supabase.from('AlertaStock').delete().lt('creadoEn', fechaLimite),
      supabase.from('PagoMixto').delete().lt('fecha', fechaLimite)
    ]);

    const errors = results.filter(r => r.error).map(r => r.error.message);

    if (errors.length > 0) {
      return res.status(500).json({ error: 'Algunos errores ocurrieron', details: errors });
    }

    res.json({ ok: true, message: 'Depuración completada exitosamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
