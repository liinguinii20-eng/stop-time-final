import express from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/ejecutar', requireAdmin, async (req, res) => {
  try {
    // 1. Recopilar datos (Historial Cerrado)
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    const fechaFin = tresMesesAtras;

    // Obtener la fecha de inicio a partir de la última depuración
    const ultimoReporte = await prisma.reporteTrimestral.findFirst({
      orderBy: { fechaFin: 'desc' }
    });
    const fechaInicio = ultimoReporte ? ultimoReporte.fechaFin : new Date(0);

    // Calcular período
    const year = fechaFin.getFullYear();
    const month = fechaFin.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const periodo = `Trimestre ${quarter} - ${year}`;

    // Comandas pagadas y sus detalles
    const comandasCerradas = await prisma.comanda.findMany({
      where: {
        estado: 'pagada',
        fecha_apertura: {
          gte: fechaInicio,
          lt: fechaFin
        }
      },
      include: { detalles: true }
    });

    // Ventas (Transacciones de caja)
    const ventas = await prisma.venta.findMany({
      where: {
        fecha_hora: {
          gte: fechaInicio,
          lt: fechaFin
        },
        estado: { not: 'ARCHIVADO' }
      },
      include: { detalles: true }
    });

    // Adelantos
    const adelantos = await prisma.adelanto.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lt: fechaFin
        },
        estado: { not: 'ARCHIVADO' }
      }
    });

    // Gastos
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lt: fechaFin
        },
        estado: { not: 'ARCHIVADO' }
      }
    });

    // Nóminas (para consolidar y guardar en reporte)
    const nominas = await prisma.nomina.findMany({
      where: {
        fecha_pago: {
          gte: fechaInicio,
          lt: fechaFin
        },
        estado: { not: 'ARCHIVADO' }
      }
    });

    // Pagos Mixtos
    const pagosMixtos = await prisma.pagoMixto.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lt: fechaFin
        }
      }
    });

    // Cuentas por Cobrar (Solo las pagadas para eliminar, pero para el reporte quizás todas?)
    // "ni cuentas por cobrar que aún tengan saldo a favor o estén pendientes. Solo se purga el historial cerrado."
    const cxcPagadas = await prisma.cuentaPorCobrar.findMany({
      where: {
        OR: [
          { estado: 'pagada' },
          { monto_pendiente: { lte: 0 } }
        ],
        fecha_creacion: {
          gte: fechaInicio,
          lt: fechaFin
        }
      }
    });

    // Pagos de CxC de esas cuentas pagadas
    const cxcPagadasIds = cxcPagadas.map(c => c.id);
    const pagosCxcPagadas = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        OR: [
          { cuenta_id: { in: cxcPagadasIds } },
          { cuentaId: { in: cxcPagadasIds } }
        ],
        fecha_pago: {
          gte: fechaInicio,
          lt: fechaFin
        }
      }
    });

    // Cuentas por cobrar e historial general para el reporte (todas las transacciones de los ultimos 3 meses o todo el historial que se va a purgar)
    const todasCxc = await prisma.cuentaPorCobrar.findMany({
      where: {
        fecha_creacion: {
          gte: fechaInicio,
          lt: fechaFin
        }
      }
    });
    const todosPagosCxc = await prisma.pagoCuentaPorCobrar.findMany({
      where: {
        fecha_pago: {
          gte: fechaInicio,
          lt: fechaFin
        }
      }
    });

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

    // --- Hoja: Nominas ---
    const sheetNominas = workbook.addWorksheet('Nominas');
    sheetNominas.columns = [
      { header: 'Fecha Pago', key: 'fecha' },
      { header: 'Empleado', key: 'empleado' },
      { header: 'Salario Base USD', key: 'base' },
      { header: 'Total Adelantos Descontados USD', key: 'adelantos' },
      { header: 'Salario Neto Pagado USD', key: 'neto' },
      { header: 'Método Pago', key: 'metodo' },
      { header: 'Moneda', key: 'moneda' },
      { header: 'Monto Convertido', key: 'monto_convertido' }
    ];

    nominas.forEach(n => {
      sheetNominas.addRow({
        fecha: n.fecha_pago ? new Date(n.fecha_pago).toLocaleString() : '',
        empleado: n.empleado_nombre || '',
        base: n.salario_base || 0,
        adelantos: n.total_adelantos || 0,
        neto: n.salario_neto || 0,
        metodo: n.metodo_pago || '',
        moneda: n.moneda_pago || 'USD',
        monto_convertido: n.monto_convertido || 0
      });
    });
    styleHeader(sheetNominas);

    // Generar buffer del Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // 3. Limpieza Segura de BD con prisma.$transaction
    // "eliminar ese historial transaccional viejo... NO puedes borrar la base de productos, clientes, ni cuentas por cobrar pendientes."
    
    await prisma.$transaction(async (tx) => {
      // 3.1 Calcular y guardar totales en ReporteTrimestral
      const totalNominasPagadas = nominas.reduce((sum, n) => sum + (n.salario_neto || 0), 0);
      const totalAdelantos = adelantos.reduce((sum, a) => sum + (a.monto || 0), 0);
      const totalIngresosCaja = ventas.reduce((sum, v) => sum + (v.total_venta || 0), 0);
      const totalEgresosCaja = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

      await tx.reporteTrimestral.create({
        data: {
          periodo,
          fechaInicio,
          fechaFin,
          totalNominasPagadas,
          totalAdelantos,
          totalIngresosCaja,
          totalEgresosCaja
        }
      });

      // 3.2 Soft delete de finanzas (Nomina, Adelanto, Gasto, Venta) a estado "ARCHIVADO"
      const nominasIds = nominas.map(n => n.id);
      if (nominasIds.length > 0) {
        await tx.nomina.updateMany({
          where: { id: { in: nominasIds } },
          data: { estado: 'ARCHIVADO' }
        });
      }

      const adelantosIds = adelantos.map(a => a.id);
      if (adelantosIds.length > 0) {
        await tx.adelanto.updateMany({
          where: { id: { in: adelantosIds } },
          data: { estado: 'ARCHIVADO' }
        });
      }

      const gastosIds = gastos.map(g => g.id);
      if (gastosIds.length > 0) {
        await tx.gasto.updateMany({
          where: { id: { in: gastosIds } },
          data: { estado: 'ARCHIVADO' }
        });
      }

      const ventasIds = ventas.map(v => v.id);
      if (ventasIds.length > 0) {
        await tx.venta.updateMany({
          where: { id: { in: ventasIds } },
          data: { estado: 'ARCHIVADO' }
        });
      }

      // 3.3 Eliminar Detalles de Comandas Cerradas y luego las Comandas Cerradas (del rango)
      const comandasCerradasIds = comandasCerradas.map(c => c.id);
      if (comandasCerradasIds.length > 0) {
        await tx.detalleComanda.deleteMany({ where: { comandaId: { in: comandasCerradasIds } } });
        await tx.comanda.deleteMany({ where: { id: { in: comandasCerradasIds } } });
      }

      // 3.4 Eliminar Cuentas por Cobrar Pagadas y sus pagos (del rango)
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
