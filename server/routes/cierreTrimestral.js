import express from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/ejecutar', requireAdmin, async (req, res) => {
  try {
    // 1. Recopilar datos (Historial Cerrado)
    // Comandas pagadas y sus detalles
    const comandasCerradas = await prisma.comanda.findMany({
      where: { estado: 'pagada' },
      include: { detalles: true }
    });

    // Ventas (Transacciones de caja)
    const ventas = await prisma.venta.findMany({
      include: { detalles: true }
    });

    // Adelantos
    const adelantos = await prisma.adelanto.findMany();

    // Gastos
    const gastos = await prisma.gasto.findMany();

    // Pagos Mixtos
    const pagosMixtos = await prisma.pagoMixto.findMany();

    // Cuentas por Cobrar (Solo las pagadas para eliminar, pero para el reporte quizás todas?)
    // "ni cuentas por cobrar que aún tengan saldo a favor o estén pendientes. Solo se purga el historial cerrado."
    const cxcPagadas = await prisma.cuentaPorCobrar.findMany({
      where: {
        OR: [
          { estado: 'pagada' },
          { monto_pendiente: { lte: 0 } }
        ]
      }
    });

    // Pagos de CxC de esas cuentas pagadas
    const cxcPagadasIds = cxcPagadas.map(c => c.id);
    const pagosCxcPagadas = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        OR: [
          { cuenta_id: { in: cxcPagadasIds } },
          { cuentaId: { in: cxcPagadasIds } }
        ]
      }
    });

    // Cuentas por cobrar e historial general para el reporte (todas las transacciones de los ultimos 3 meses o todo el historial que se va a purgar)
    const todasCxc = await prisma.cuentaPorCobrar.findMany();
    const todosPagosCxc = await prisma.pagoCuentaPorCobrar.findMany();

    // 2. Generar Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Stop Time Bar Sushi';
    workbook.created = new Date();

    // Función para dar estilo a las cabeceras
    const styleHeader = (worksheet) => {
      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo 600
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxColumnLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxColumnLength) {
            maxColumnLength = columnLength;
          }
        });
        column.width = maxColumnLength < 15 ? 15 : maxColumnLength + 2;
      });
    };

    // --- Hoja 1: Resumen Financiero ---
    const sheetResumen = workbook.addWorksheet('Resumen Financiero');
    sheetResumen.columns = [
      { header: 'Concepto', key: 'concepto' },
      { header: 'Total USD (Efectivo/Zelle/Otros)', key: 'usd' },
      { header: 'Total Bs (Tarjeta/Pago Móvil)', key: 'bs' }
    ];

    let totalVentasUSD = 0;
    let totalVentasBs = 0;
    ventas.forEach(v => {
      const isBs = v.metodo_pago && (v.metodo_pago.toLowerCase().includes('bs') || v.metodo_pago.toLowerCase().includes('bolivar') || v.metodo_pago.toLowerCase().includes('pago_movil') || v.metodo_pago.toLowerCase().includes('punto'));
      if (isBs) {
        totalVentasBs += (v.monto_original || v.total_venta || 0); // Asumiendo que monto_original guarda el valor en Bs cuando es método Bs
      } else if (v.metodo_pago === 'mixto') {
        // En mixtos, debemos buscar en la tabla PagoMixto
        const mixtos = pagosMixtos.filter(pm => pm.ventaId === v.id);
        mixtos.forEach(pm => {
          const pmIsBs = pm.metodo_pago && (pm.metodo_pago.toLowerCase().includes('bs') || pm.metodo_pago.toLowerCase().includes('bolivar'));
          if (pmIsBs) {
            totalVentasBs += (pm.monto_original || pm.monto || 0);
          } else {
            totalVentasUSD += (pm.monto_usd || pm.monto || 0);
          }
        });
      } else {
        totalVentasUSD += (v.total_venta || 0);
      }
    });

    let totalAdelantosUSD = 0;
    let totalAdelantosBs = 0;
    adelantos.forEach(a => {
      const isBs = a.metodo_pago && a.metodo_pago.toLowerCase().includes('bs');
      if (isBs) {
        totalAdelantosBs += (a.monto_original || a.monto || 0);
      } else {
        totalAdelantosUSD += (a.monto || 0);
      }
    });

    let totalGastosUSD = 0;
    let totalGastosBs = 0;
    gastos.forEach(g => {
      const isBs = g.metodo_pago && g.metodo_pago.toLowerCase().includes('bs');
      if (isBs) {
        totalGastosBs += (g.monto_original || g.monto || 0);
      } else {
        totalGastosUSD += (g.monto || 0);
      }
    });

    sheetResumen.addRows([
      { concepto: 'Ingresos por Ventas', usd: totalVentasUSD.toFixed(2), bs: totalVentasBs.toFixed(2) },
      { concepto: 'Adelantos de Nómina', usd: totalAdelantosUSD.toFixed(2), bs: totalAdelantosBs.toFixed(2) },
      { concepto: 'Gastos Operativos', usd: totalGastosUSD.toFixed(2), bs: totalGastosBs.toFixed(2) }
    ]);
    
    // Fila de totales
    const rowTotal = sheetResumen.addRow({
      concepto: 'TOTAL NETO (Ventas - Adelantos - Gastos)',
      usd: (totalVentasUSD - totalAdelantosUSD - totalGastosUSD).toFixed(2),
      bs: (totalVentasBs - totalAdelantosBs - totalGastosBs).toFixed(2)
    });
    rowTotal.font = { bold: true };
    styleHeader(sheetResumen);

    // --- Hoja 2: Comandas ---
    const sheetComandas = workbook.addWorksheet('Comandas');
    sheetComandas.columns = [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Número Comanda', key: 'numero' },
      { header: 'Mesero', key: 'mesero' },
      { header: 'Plato/Ítem', key: 'plato' },
      { header: 'Cantidad (Unidades/Kilos)', key: 'cantidad' },
      { header: 'Precio Unitario', key: 'precio' },
      { header: 'Subtotal', key: 'subtotal' }
    ];

    comandasCerradas.forEach(c => {
      c.detalles.forEach(d => {
        sheetComandas.addRow({
          fecha: c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString() : '',
          numero: c.numero_comanda,
          mesero: c.mesero_nombre || '',
          plato: d.platoNombre || '',
          cantidad: d.cantidad,
          precio: d.precio,
          subtotal: d.cantidad * d.precio
        });
      });
    });
    styleHeader(sheetComandas);

    // --- Hoja 3: Cuentas por Cobrar ---
    const sheetCxC = workbook.addWorksheet('Cuentas por Cobrar');
    sheetCxC.columns = [
      { header: 'Fecha Creación', key: 'fecha' },
      { header: 'Cliente/Empleado', key: 'cliente' },
      { header: 'Monto Total', key: 'total' },
      { header: 'Monto Pagado', key: 'pagado' },
      { header: 'Monto Pendiente', key: 'pendiente' },
      { header: 'Estado', key: 'estado' },
      { header: 'Pagos en USD', key: 'pagos_usd' },
      { header: 'Pagos en Bs', key: 'pagos_bs' }
    ];

    todasCxc.forEach(cxc => {
      let pagosUsd = 0;
      let pagosBs = 0;
      const pagosCxc = todosPagosCxc.filter(p => p.cuenta_id === cxc.id || p.cuentaId === cxc.id);
      pagosCxc.forEach(p => {
        const isBs = p.metodo && p.metodo.toLowerCase().includes('bs');
        if (isBs) {
          pagosBs += (p.monto_pagado || p.monto || 0); // Asumiendo que monto_pagado tiene el equivalente si es Bs, o monto
        } else {
          pagosUsd += (p.monto || 0);
        }
      });

      sheetCxC.addRow({
        fecha: cxc.fecha_creacion ? new Date(cxc.fecha_creacion).toLocaleString() : '',
        cliente: cxc.clienteNombre || '',
        total: cxc.monto_total || cxc.monto,
        pagado: (cxc.monto_total || cxc.monto) - (cxc.monto_pendiente || 0),
        pendiente: cxc.monto_pendiente || 0,
        estado: cxc.estado,
        pagos_usd: pagosUsd.toFixed(2),
        pagos_bs: pagosBs.toFixed(2)
      });
    });
    styleHeader(sheetCxC);

    // --- Hoja 4: Adelantos ---
    const sheetAdelantos = workbook.addWorksheet('Adelantos');
    sheetAdelantos.columns = [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Empleado', key: 'empleado' },
      { header: 'Descripción', key: 'descripcion' },
      { header: 'Monto USD', key: 'usd' },
      { header: 'Monto Bs', key: 'bs' },
      { header: 'Método Pago', key: 'metodo' }
    ];

    adelantos.forEach(a => {
      const isBs = a.metodo_pago && a.metodo_pago.toLowerCase().includes('bs');
      sheetAdelantos.addRow({
        fecha: a.fecha ? new Date(a.fecha).toLocaleString() : '',
        empleado: a.empleado || '',
        descripcion: a.descripcion || '',
        usd: isBs ? 0 : (a.monto || 0),
        bs: isBs ? (a.monto_original || a.monto || 0) : 0,
        metodo: a.metodo_pago || ''
      });
    });
    styleHeader(sheetAdelantos);

    // --- Transacciones de Caja (Ventas/Gastos) Adicional si es necesario ---
    // Lo integro en resumen o creo una hoja extra para detalles de transacciones (Opcional, pero pidieron 4 hojas según el prompt, 
    // pero también pidieron "Transacciones de caja". Lo pondré en una hoja "Transacciones Caja").
    const sheetCaja = workbook.addWorksheet('Transacciones Caja');
    sheetCaja.columns = [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Tipo', key: 'tipo' },
      { header: 'Monto USD', key: 'usd' },
      { header: 'Monto Bs', key: 'bs' },
      { header: 'Método Pago', key: 'metodo' }
    ];

    ventas.forEach(v => {
      const isBs = v.metodo_pago && v.metodo_pago.toLowerCase().includes('bs');
      sheetCaja.addRow({
        fecha: v.fecha_hora ? new Date(v.fecha_hora).toLocaleString() : '',
        tipo: 'Venta',
        usd: isBs ? 0 : (v.total_venta || 0),
        bs: isBs ? (v.monto_original || v.total_ves || 0) : 0,
        metodo: v.metodo_pago || ''
      });
    });
    gastos.forEach(g => {
      const isBs = g.metodo_pago && g.metodo_pago.toLowerCase().includes('bs');
      sheetCaja.addRow({
        fecha: g.fecha ? new Date(g.fecha).toLocaleString() : '',
        tipo: 'Gasto',
        usd: isBs ? 0 : (g.monto || 0),
        bs: isBs ? (g.monto_original || g.monto || 0) : 0,
        metodo: g.metodo_pago || ''
      });
    });
    styleHeader(sheetCaja);


    // Generar buffer del Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // 3. Limpieza Segura de BD con prisma.$transaction
    // "eliminar ese historial transaccional viejo... NO puedes borrar la base de productos, clientes, ni cuentas por cobrar pendientes."
    
    await prisma.$transaction(async (tx) => {
      // 3.1 Eliminar Detalles de Comandas Cerradas y luego las Comandas Cerradas
      const comandasCerradasIds = comandasCerradas.map(c => c.id);
      if (comandasCerradasIds.length > 0) {
        await tx.detalleComanda.deleteMany({ where: { comandaId: { in: comandasCerradasIds } } });
        await tx.comanda.deleteMany({ where: { id: { in: comandasCerradasIds } } });
      }

      // 3.2 Eliminar Detalles de Ventas y luego Ventas (todas las ventas históricas exportadas)
      const ventasIds = ventas.map(v => v.id);
      if (ventasIds.length > 0) {
        await tx.detalleVenta.deleteMany({ where: { ventaId: { in: ventasIds } } });
        await tx.pagoMixto.deleteMany({ where: { ventaId: { in: ventasIds } } }); // Pagos mixtos asociados
        await tx.venta.deleteMany({ where: { id: { in: ventasIds } } });
      }

      // 3.3 Eliminar Adelantos
      await tx.adelanto.deleteMany();

      // 3.4 Eliminar Gastos
      await tx.gasto.deleteMany();

      // 3.5 Eliminar Cuentas por Cobrar Pagadas y sus pagos
      if (cxcPagadasIds.length > 0) {
        await tx.pagoCuentaPorCobrar.deleteMany({
          where: {
            OR: [
              { cuenta_id: { in: cxcPagadasIds } },
              { cuentaId: { in: cxcPagadasIds } }
            ]
          }
        });
        await tx.cuentaPorCobrar.deleteMany({ where: { id: { in: cxcPagadasIds } } });
      }
    });

    // 4. Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Cierre_Trimestral.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error('Error en Cierre Trimestral:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
