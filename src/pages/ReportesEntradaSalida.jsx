import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, Eye, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ReportesEntradaSalida() {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const data = await base44.entities.Venta.list('-created_date', 500);
      console.log('✅ Ventas cargadas para entrada/salida:', data.length);
      data.forEach(v => {
        if (v.metodo_pago) {
          console.log(`  - Venta ${v.id.substring(0,8)}: ${v.metodo_pago} - $${v.total_venta}`);
        }
      });
      return data;
    },
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: async () => {
      const data = await base44.entities.Gasto.list('-created_date', 500);
      console.log('✅ Gastos cargados para entrada/salida:', data.length);
      data.forEach(g => {
        if (g.metodo_pago) {
          console.log(`  - Gasto ${g.id.substring(0,8)}: ${g.metodo_pago} - $${g.monto}`);
        }
      });
      return data;
    },
  });

  const { data: adelantos = [], isLoading: loadingAdelantos } = useQuery({
    queryKey: ['adelantos'],
    queryFn: () => base44.entities.Adelanto.list('-created_date', 1000),
  });

  const { data: pagosCuentas = [], isLoading: loadingPagosCuentas } = useQuery({
    queryKey: ['pagos-cuentas'],
    queryFn: async () => {
      const data = await base44.entities.PagoCuentaPorCobrar.list('-created_date', 1000);
      console.log('✅ Pagos de créditos cargados para E/S:', data.length);
      return data;
    },
  });

  const metodosConfig = {
    efectivo_usd: { label: "💵 Efectivo USD", moneda: "usd", simbolo: "$" },
    binance_usd: { label: "📱 Binance", moneda: "usd", simbolo: "$" },
    zinli_usd: { label: "📱 Zinli", moneda: "usd", simbolo: "$" },
    paypal_usd: { label: "🌐 PayPal", moneda: "usd", simbolo: "$" },
    zelle_usd: { label: "🏦 Zelle", moneda: "usd", simbolo: "$" },
    efectivo_cop: { label: "💵 Efectivo COP", moneda: "cop", simbolo: "₡" },
    nequi_cop: { label: "📱 Nequi", moneda: "cop", simbolo: "₡" },
    tarjeta_bs: { label: "💳 Tarjeta Bs", moneda: "ves", simbolo: "Bs" },
    pago_movil_bs: { label: "📱 Pago Móvil", moneda: "ves", simbolo: "Bs" }
  };

  const ventasFiltradas = ventas.filter(v => {
    try {
      const fechaVenta = parseISO(v.fecha_hora);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaVenta >= inicio && fechaVenta <= fin;
    } catch {
      return false;
    }
  });

  const gastosNormales = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto || g.fecha);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaGasto >= inicio && fechaGasto <= fin && g.afecta_caja !== false;
    } catch {
      return false;
    }
  });

  const adelantosFiltrados = adelantos.filter(a => {
    try {
      const fechaA = parseISO(a.fecha_adelanto || a.fecha || a.createdAt);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaA >= inicio && fechaA <= fin;
    } catch {
      return false;
    }
  }).map(a => ({
    id: a.id,
    categoria: 'Adelanto a Personal',
    descripcion: `Adelanto: ${a.empleado || a.empleadoId || 'Empleado'}${a.descripcion ? ' - ' + a.descripcion : ''}`,
    monto: a.monto || 0,
    monto_original: a.monto_original || 0,
    moneda_original: a.moneda_original,
    metodo_pago: a.metodo_pago,
    fecha_gasto: a.fecha_adelanto || a.fecha || a.createdAt,
    afecta_caja: true
  }));

  const gastosFiltrados = [...gastosNormales, ...adelantosFiltrados];

  const pagosCuentasFiltrados = pagosCuentas.filter(p => {
    try {
      const fechaP = parseISO(p.fecha_pago || p.createdAt);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaP >= inicio && fechaP <= fin;
    } catch {
      return false;
    }
  });

  // Calcular entradas y salidas por método
  const calcularMovimientos = () => {
    const movimientos = {};
    
    // Inicializar
    Object.keys(metodosConfig).forEach(metodo => {
      movimientos[metodo] = { 
        entradas: 0, 
        salidas: 0, 
        cantidad_entradas: 0, 
        cantidad_salidas: 0 
      };
    });

    // ENTRADAS: Ventas simples
    ventasFiltradas.forEach(venta => {
      if (venta.metodo_pago !== 'mixto' && movimientos[venta.metodo_pago]) {
        const esBs = venta.metodo_pago.endsWith('_bs');
        movimientos[venta.metodo_pago].entradas += esBs ? (venta.total_ves || 0) : venta.total_venta;
        movimientos[venta.metodo_pago].cantidad_entradas += 1;
      }
    });

    // ENTRADAS: Pagos mixtos
    const ventasIds = ventasFiltradas.map(v => v.id);
    pagosMixtos.forEach(pago => {
      if (ventasIds.includes(pago.venta_id) && movimientos[pago.metodo_pago]) {
        const esBs = pago.metodo_pago.endsWith('_bs');
        movimientos[pago.metodo_pago].entradas += esBs ? (pago.monto_original || 0) : (pago.monto_usd || 0);
        movimientos[pago.metodo_pago].cantidad_entradas += 1;
      }
    });

    // ENTRADAS: Pagos de cuentas por cobrar (créditos cobrados)
    pagosCuentasFiltrados.forEach(pago => {
      const metodo = pago.metodo_pago || 'efectivo_usd';
      if (movimientos[metodo]) {
        const esBs = metodo.endsWith('_bs');
        movimientos[metodo].entradas += esBs ? (pago.monto_pagado || 0) : (pago.monto_pagado || 0);
        movimientos[metodo].cantidad_entradas += 1;
      }
    });

    // SALIDAS: Gastos
    gastosFiltrados.forEach(gasto => {
      if (movimientos[gasto.metodo_pago]) {
        const esBs = gasto.metodo_pago.endsWith('_bs');
        movimientos[gasto.metodo_pago].salidas += esBs ? (gasto.monto_original || gasto.monto || 0) : (gasto.monto || 0);
        movimientos[gasto.metodo_pago].cantidad_salidas += 1;
      }
    });

    return movimientos;
  };

  const movimientos = calcularMovimientos();

  // Calcular totales generales separados por moneda
  let totalEntradasUSD = 0;
  let totalSalidasUSD = 0;
  let totalEntradasBs = 0;
  let totalSalidasBs = 0;
  const reportes = Object.entries(metodosConfig).map(([key, config]) => {
    const mov = movimientos[key];
    const saldo = mov.entradas - mov.salidas;
    const esBs = key.endsWith('_bs');
    if (esBs) {
      totalEntradasBs += mov.entradas;
      totalSalidasBs += mov.salidas;
    } else {
      totalEntradasUSD += mov.entradas;
      totalSalidasUSD += mov.salidas;
    }
    
    return {
      metodo: key,
      ...config,
      ...mov,
      saldo,
      esBs,
      cantidad_movimientos: mov.cantidad_entradas + mov.cantidad_salidas
    };
  }).filter(r => r.cantidad_movimientos > 0);

  const saldoNetoUSD = totalEntradasUSD - totalSalidasUSD;
  const saldoNetoBs = totalEntradasBs - totalSalidasBs;

  const exportarExcel = () => {
    const rows = [
      ["REPORTE DE ENTRADA/SALIDA POR MÉTODO DE PAGO"],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["Método de Pago", "Entradas", "Salidas", "Saldo", "Total Movimientos"],
    ];

    reportes.forEach(r => {
      rows.push([
        r.label,
        `$${r.entradas.toFixed(2)}`,
        `$${r.salidas.toFixed(2)}`,
        `$${r.saldo.toFixed(2)}`,
        r.cantidad_movimientos
      ]);
    });

    rows.push([]);
    rows.push(["TOTALES", `$${totalEntradasGeneral.toFixed(2)}`, `$${totalSalidasGeneral.toFixed(2)}`, `$${saldoNetoGeneral.toFixed(2)}`, ""]);

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_entrada_salida_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado exitosamente");
  };

  const isLoading = loadingVentas || loadingPagos || loadingGastos || loadingAdelantos || loadingPagosCuentas;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <p className="text-slate-400">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              Reportes de Entrada/Salida
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Flujo de caja por método de pago</p>
          </div>
          <Button onClick={exportarExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Fecha Inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-white/10 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Fecha Fin</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-white/10 border-white/10 text-white" />
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider">💰 Entradas USD</p>
            <p className="text-3xl font-black mt-1 text-emerald-400">${totalEntradasUSD.toFixed(2)}</p>
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.05))', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400/70 text-xs font-bold uppercase tracking-wider">💸 Salidas USD</p>
            <p className="text-3xl font-black mt-1 text-red-400">${totalSalidasUSD.toFixed(2)}</p>
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}>
            <p className="text-violet-400/70 text-xs font-bold uppercase tracking-wider">✅ Saldo USD</p>
            <p className={`text-3xl font-black mt-1 ${saldoNetoUSD >= 0 ? 'text-violet-400' : 'text-red-400'}`}>${saldoNetoUSD.toFixed(2)}</p>
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">💳 Saldo Bs</p>
            <p className={`text-3xl font-black mt-1 ${saldoNetoBs >= 0 ? 'text-amber-400' : 'text-red-400'}`}>Bs {saldoNetoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-amber-300/60">▲ Bs {totalEntradasBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
              <span className="text-red-300/60">▼ Bs {totalSalidasBs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Reportes por Método */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-5">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">📊 Reportes Disponibles</h3>
            {reportes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportes.map(reporte => {
                  const saldoPositivo = reporte.saldo >= 0;
                  return (
                    <div 
                      key={reporte.metodo} 
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: saldoPositivo ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${saldoPositivo ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}
                    >
                      <h3 className="font-bold text-white">{reporte.label}</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">💰 Entradas:</span>
                          <span className="font-semibold text-emerald-400">
                            {reporte.esBs 
                              ? `Bs ${reporte.entradas.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `$${reporte.entradas.toFixed(2)}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">💸 Salidas:</span>
                          <span className="font-semibold text-red-400">
                            {reporte.esBs 
                              ? `Bs ${reporte.salidas.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `$${reporte.salidas.toFixed(2)}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <span className="text-slate-300 font-medium">✅ Saldo:</span>
                          <span className={`font-bold text-lg ${saldoPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
                            {reporte.esBs 
                              ? `Bs ${reporte.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `$${reporte.saldo.toFixed(2)}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>📊 Movimientos:</span>
                          <span>{reporte.cantidad_movimientos}</span>
                        </div>
                      </div>

                      <Link to={createPageUrl(`ReporteEntradaSalidaDetalle?metodo=${reporte.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                        <Button className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white border-white/10" size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Reporte Completo
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay movimientos en este período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}