import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Download, Calendar, DollarSign, ShoppingCart, Clock, UtensilsCrossed, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfDay, endOfDay, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function VentaDetallada({ venta, detalles }) {
  const [expandido, setExpandido] = useState(false);
  const detallesVenta = detalles.filter(d => d.venta_id === venta.id);

  return (
    <div className="border-b last:border-b-0">
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-green-50 cursor-pointer transition-colors gap-2"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {format(parseISO(venta.fecha_hora), "HH:mm", { locale: es })}
            </p>
            <Badge variant="outline" className="mt-1 text-xs">{venta.metodo_pago}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span className="text-xs sm:text-sm text-gray-600">{detallesVenta.length} platos</span>
          </div>
        </div>
        <div className="flex items-center justify-between sm:gap-4">
          <p className="text-lg sm:text-xl font-bold text-green-600">${venta.total_venta.toFixed(2)}</p>
          {expandido ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {expandido && detallesVenta.length > 0 && (
        <div className="bg-gray-50 px-2 sm:px-4 pb-3 sm:pb-4">
          <div className="bg-white rounded-lg p-3 sm:p-4 space-y-2">
            {detallesVenta.map((detalle) => (
              <div key={detalle.id} className="flex justify-between items-center py-2 border-b last:border-b-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 font-bold text-xs sm:text-sm">{detalle.cantidad}x</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{detalle.plato_nombre}</p>
                    <p className="text-xs text-gray-500">${detalle.precio_unitario.toFixed(2)} c/u</p>
                  </div>
                </div>
                <p className="font-bold text-gray-700 text-sm sm:text-base flex-shrink-0">${detalle.subtotal.toFixed(2)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
              <span className="font-semibold text-gray-700 text-sm sm:text-base">Total de la venta:</span>
              <span className="text-lg sm:text-xl font-bold text-green-600">${venta.total_venta.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reportes() {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: ventas = [], isLoading: loadingVentas, error: errorVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Venta.list('-created_date', 500);
        console.log('Ventas cargadas:', data.length, data);
        return data;
      } catch (error) {
        console.error('Error cargando ventas:', error);
        throw error;
      }
    },
  });

  const { data: detallesVentas = [], isLoading: loadingDetalles, error: errorDetalles } = useQuery({
    queryKey: ['detalles-ventas'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DetalleVenta.list('-created_date', 1000);
        console.log('Detalles cargados:', data.length);
        return data;
      } catch (error) {
        console.error('Error cargando detalles:', error);
        throw error;
      }
    },
  });

  const { data: gastos = [], isLoading: loadingGastos, error: errorGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: async () => {
      try {
        return await base44.entities.Gasto.list('-created_date', 500);
      } catch (error) {
        console.error('Error cargando gastos:', error);
        throw error;
      }
    },
  });

  const { data: adelantos = [], isLoading: loadingAdelantos, error: errorAdelantos } = useQuery({
    queryKey: ['adelantos'],
    queryFn: async () => {
      try {
        return await base44.entities.Adelanto.list('-created_date', 1000);
      } catch (error) {
        console.error('Error cargando adelantos:', error);
        throw error;
      }
    },
  });

  const { data: pagosCuentas = [], isLoading: loadingPagosCuentas, error: errorPagosCuentas } = useQuery({
    queryKey: ['pagos-cuentas'],
    queryFn: async () => {
      try {
        return await base44.entities.PagoCuentaPorCobrar.list('-created_date', 1000);
      } catch (error) {
        console.error('Error cargando pagos-cuentas:', error);
        throw error;
      }
    },
  });

  // Ventas de HOY
  const ventasHoy = ventas.filter(v => {
    try {
      const fechaVenta = parseISO(v.fecha_hora);
      return isToday(fechaVenta);
    } catch (error) {
      console.error('Error parseando fecha:', v.fecha_hora, error);
      return false;
    }
  });

  // Pagos de créditos de HOY
  const pagosCuentasHoy = pagosCuentas.filter(p => {
    try {
      const fechaP = parseISO(p.fecha_pago || p.createdAt);
      return isToday(fechaP);
    } catch (error) {
      return false;
    }
  });

  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + (v.total_venta || 0), 0)
    + pagosCuentasHoy.filter(p => !metodosBolivares(p.metodo_pago)).reduce((sum, p) => sum + (p.monto_pagado || 0), 0);

  // Filtrar por rango de fechas seleccionado
  const ventasFiltradas = ventas.filter(v => {
    try {
      const fechaVenta = parseISO(v.fecha_hora);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaVenta >= inicio && fechaVenta <= fin;
    } catch (error) {
      console.error('Error filtrando venta:', v, error);
      return false;
    }
  });

  const pagosCuentasFiltrados = pagosCuentas.filter(p => {
    try {
      const fechaP = parseISO(p.fecha_pago || p.createdAt);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaP >= inicio && fechaP <= fin;
    } catch (error) {
      console.error('Error filtrando pago-cuenta:', p, error);
      return false;
    }
  });

  const gastosNormales = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto || g.fecha);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaGasto >= inicio && fechaGasto <= fin;
    } catch (error) {
      console.error('Error filtrando gasto:', g, error);
      return false;
    }
  });

  const adelantosFiltrados = adelantos.filter(a => {
    try {
      const fechaA = parseISO(a.fecha_adelanto || a.fecha || a.createdAt);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaA >= inicio && fechaA <= fin;
    } catch (error) {
      console.error('Error filtrando adelanto:', a, error);
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
    comprobante: ''
  }));

  const gastosFiltrados = [...gastosNormales, ...adelantosFiltrados];

  // Separar flujos por moneda - 3 grupos claros
  const metodosBolivares = (metodo) => metodo && metodo.endsWith('_bs');
  const metodosCOP = (metodo) => metodo && metodo.endsWith('_cop');
  const metodosEfectivoUSD = (metodo) => metodo === 'efectivo_usd';
  const metodosDivisas = (metodo) => metodo && !metodo.endsWith('_bs') && !metodo.endsWith('_cop') && !['cuentas_por_cobrar', 'mixto'].includes(metodo);

  // ── CAJA EFECTIVO USD (solo cash físico) ──
  const totalVentasEfectivo = ventasFiltradas.filter(v => metodosEfectivoUSD(v.metodo_pago)).reduce((sum, v) => sum + (v.total_venta || 0), 0) + pagosCuentasFiltrados.filter(p => metodosEfectivoUSD(p.metodo_pago)).reduce((sum, p) => sum + (p.monto_pagado || 0), 0);
  const totalGastosEfectivo = gastosFiltrados.filter(g => metodosEfectivoUSD(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const netoEfectivo = totalVentasEfectivo - totalGastosEfectivo;

  // ── DIVISAS DIGITALES (Binance, Zinli, PayPal, Zelle) ──
  const metodosDigitalesUSD = (metodo) => metodo && !metodo.endsWith('_bs') && !metodo.endsWith('_cop') && metodo !== 'efectivo_usd' && !['cuentas_por_cobrar', 'mixto'].includes(metodo);
  const totalVentasDigitales = ventasFiltradas.filter(v => metodosDigitalesUSD(v.metodo_pago)).reduce((sum, v) => sum + (v.total_venta || 0), 0) + pagosCuentasFiltrados.filter(p => metodosDigitalesUSD(p.metodo_pago)).reduce((sum, p) => sum + (p.monto_pagado || 0), 0);
  const totalGastosDigitales = gastosFiltrados.filter(g => metodosDigitalesUSD(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const netoDigitales = totalVentasDigitales - totalGastosDigitales;

  // ── Total USD (efectivo + digitales) ──
  const totalVentasDivisas = ventasFiltradas.filter(v => metodosDivisas(v.metodo_pago)).reduce((sum, v) => sum + (v.total_venta || 0), 0) + pagosCuentasFiltrados.filter(p => metodosDivisas(p.metodo_pago)).reduce((sum, p) => sum + (p.monto_pagado || 0), 0);
  const totalGastosDivisas = gastosFiltrados.filter(g => metodosDivisas(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const netoDivisas = totalVentasDivisas - totalGastosDivisas;

  // ── BOLÍVARES (Bs) ──
  // Para pagos de créditos en Bs, convertir monto USD * tasa guardada
  const totalVentasBolivares = ventasFiltradas.filter(v => metodosBolivares(v.metodo_pago)).reduce((sum, v) => sum + (v.total_ves || 0), 0) + pagosCuentasFiltrados.filter(p => metodosBolivares(p.metodo_pago)).reduce((sum, p) => sum + ((p.monto_pagado || 0) * (p.tasa_bs_aplicada || 1)), 0);
  const totalGastosBolivares = gastosFiltrados.filter(g => metodosBolivares(g.metodo_pago)).reduce((sum, g) => sum + (g.monto_original || g.monto || 0), 0);
  const netoBolivares = totalVentasBolivares - totalGastosBolivares;

  // ── COP (Pesos Colombianos) ──
  const totalVentasCOP = ventasFiltradas.filter(v => metodosCOP(v.metodo_pago)).reduce((sum, v) => sum + (v.total_venta || 0), 0) + pagosCuentasFiltrados.filter(p => metodosCOP(p.metodo_pago)).reduce((sum, p) => sum + (p.monto_pagado || 0), 0);
  const totalGastosCOP = gastosFiltrados.filter(g => metodosCOP(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const netoCOP = totalVentasCOP - totalGastosCOP;

  const exportarReporte = () => {
    const formatMonto = (v) => {
      if (metodosBolivares(v.metodo_pago)) return `Bs ${(v.total_ves || 0).toFixed(2)}`;
      return `$${(v.total_venta || 0).toFixed(2)}`;
    };
    const formatGasto = (g) => {
      if (metodosBolivares(g.metodo_pago)) return `Bs ${(g.monto_original || g.monto || 0).toFixed(2)}`;
      return `$${(g.monto || 0).toFixed(2)}`;
    };

    const csvContent = [
      ["Reporte de Rentabilidad - Stop Time"],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN FINANCIERO USD"],
      ["Ventas USD", `$${totalVentasDivisas.toFixed(2)}`],
      ["Gastos USD", `$${totalGastosDivisas.toFixed(2)}`],
      ["Neto USD", `$${netoDivisas.toFixed(2)}`],
      [],
      ["RESUMEN FINANCIERO BOLÍVARES"],
      ["Ventas Bs", `Bs ${totalVentasBolivares.toFixed(2)}`],
      ["Gastos Bs", `Bs ${totalGastosBolivares.toFixed(2)}`],
      ["Neto Bs", `Bs ${netoBolivares.toFixed(2)}`],
      [],
      ["DETALLE DE VENTAS"],
      ["Fecha", "Método Pago", "Monto"],
      ...ventasFiltradas.map(v => [
        format(parseISO(v.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es }),
        v.metodo_pago,
        formatMonto(v)
      ]),
      ...pagosCuentasFiltrados.map(p => [
        format(parseISO(p.fecha_pago || p.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
        `Pago Deuda: ${p.metodo_pago}`,
        metodosBolivares(p.metodo_pago) 
          ? `Bs ${((p.monto_pagado || 0) * (p.tasa_bs_aplicada || 1)).toFixed(2)}`
          : `$${(p.monto_pagado || 0).toFixed(2)}`
      ]),
      [],
      ["DETALLE DE GASTOS"],
      ["Fecha", "Descripción", "Categoría", "Monto"],
      ...gastosFiltrados.map(g => [
        format(parseISO(g.fecha_gasto || ''), "dd/MM/yyyy HH:mm", { locale: es }),
        g.descripcion || '',
        g.categoria || '',
        formatGasto(g)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_rentabilidad_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mostrar errores si existen
  if (errorVentas || errorDetalles || errorGastos || errorAdelantos || errorPagosCuentas) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 font-semibold mb-2">Error cargando los datos</p>
              <p className="text-sm text-gray-600">
                {errorVentas && 'Error cargando ventas. '}
                {errorDetalles && 'Error cargando detalles. '}
                {errorGastos && 'Error cargando gastos. '}
                {errorAdelantos && 'Error cargando adelantos. '}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Recargar página
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              Reporte de Rentabilidad
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Análisis financiero · Ventas vs Gastos</p>
          </div>
          <Button onClick={exportarReporte} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Ventas de HOY */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ventas de Hoy</h2>
                <p className="text-emerald-300/70 text-sm">{format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-emerald-300 text-sm font-medium">{ventasHoy.length} ventas{pagosCuentasHoy.length > 0 ? ` + ${pagosCuentasHoy.length} cobros` : ''}</p>
              <p className="text-2xl font-black text-emerald-400">${totalVentasHoy.toFixed(2)}</p>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {loadingVentas || loadingDetalles ? (
              <Skeleton className="h-48 w-full rounded-xl bg-white/10" />
            ) : ventasHoy.length > 0 ? (
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {ventasHoy.map((venta) => (
                  <VentaDetallada key={venta.id} venta={venta} detalles={detallesVentas} />
                ))}
                <div className="p-3 sm:p-4 flex justify-between items-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <span className="font-bold text-emerald-300 text-sm">TOTAL DEL DÍA</span>
                  <span className="text-xl font-black text-emerald-400">${totalVentasHoy.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <ShoppingCart className="w-14 h-14 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No hay ventas registradas hoy</p>
              </div>
            )}
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h3 className="text-white font-semibold">Período de Análisis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Desde</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-white/10 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Hasta</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-white/10 border-white/10 text-white" />
            </div>
          </div>
        </div>

        {/* Resumen Principal - Cajas de moneda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Efectivo USD */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider">💵 Caja Efectivo</p>
            <p className={`text-3xl font-black mt-1 ${netoEfectivo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${netoEfectivo.toFixed(2)}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-emerald-300/60">▲ ${totalVentasEfectivo.toFixed(2)}</span>
              <span className="text-red-300/60">▼ ${totalGastosEfectivo.toFixed(2)}</span>
            </div>
          </div>
          {/* Divisas Digitales */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-indigo-400/70 text-xs font-bold uppercase tracking-wider">📱 Divisas Digitales</p>
            <p className={`text-3xl font-black mt-1 ${netoDigitales >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>${netoDigitales.toFixed(2)}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-indigo-300/60">▲ ${totalVentasDigitales.toFixed(2)}</span>
              <span className="text-red-300/60">▼ ${totalGastosDigitales.toFixed(2)}</span>
            </div>
          </div>
          {/* Bolívares */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">💳 Banco Bolívares</p>
            <p className={`text-3xl font-black mt-1 ${netoBolivares >= 0 ? 'text-amber-400' : 'text-red-400'}`}>Bs {netoBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-amber-300/60">▲ Bs {totalVentasBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              <span className="text-red-300/60">▼ Bs {totalGastosBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          {/* COP */}
          {(totalVentasCOP > 0 || totalGastosCOP > 0) && (
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(2,132,199,0.05))', border: '1px solid rgba(14,165,233,0.2)' }}>
            <p className="text-sky-400/70 text-xs font-bold uppercase tracking-wider">🇨🇴 Pesos COP</p>
            <p className={`text-3xl font-black mt-1 ${netoCOP >= 0 ? 'text-sky-400' : 'text-red-400'}`}>${netoCOP.toFixed(2)}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-sky-300/60">▲ ${totalVentasCOP.toFixed(2)}</span>
              <span className="text-red-300/60">▼ ${totalGastosCOP.toFixed(2)}</span>
            </div>
          </div>
          )}
        </div>

        {/* Tabs */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Tabs defaultValue="ventas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-1">
            <TabsTrigger value="ventas" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 text-slate-400 rounded-xl">
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ingresos</span>
              <span className="text-xs">({ventasFiltradas.length + pagosCuentasFiltrados.length})</span>
            </TabsTrigger>
            <TabsTrigger value="gastos" className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300 text-slate-400 rounded-xl">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Gastos</span>
              <span className="text-xs">({gastosFiltrados.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ventas">
            <div className="p-4 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" /> Detalle de Ventas
              </h3>
              {loadingVentas || loadingPagosCuentas ? (
                <Skeleton className="h-64 w-full rounded-xl bg-white/10" />
              ) : ventasFiltradas.length > 0 || pagosCuentasFiltrados.length > 0 ? (
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Table>
                    <TableHeader>
                      <TableRow style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <TableHead className="text-slate-400">Fecha</TableHead>
                        <TableHead className="text-slate-400">Método</TableHead>
                        <TableHead className="text-right text-slate-400">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventasFiltradas.map((venta) => (
                        <TableRow key={venta.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-sm text-slate-300">
                            {format(parseISO(venta.fecha_hora), "dd/MM/yy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Venta: {venta.metodo_pago}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-400">
                            {metodosBolivares(venta.metodo_pago) 
                              ? `Bs ${(venta.total_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `$${venta.total_venta.toFixed(2)}`
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                      {pagosCuentasFiltrados.map((pago) => (
                        <TableRow key={`pago-${pago.id}`} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-sm text-slate-300">
                            {format(parseISO(pago.fecha_pago || pago.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'rgba(16, 185, 129, 0.9)' }}>Pago Deuda: {pago.metodo_pago}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-400">
                            {metodosBolivares(pago.metodo_pago) 
                              ? `Bs ${((pago.monto_pagado || 0) * (pago.tasa_bs_aplicada || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `$${(pago.monto_pagado || 0).toFixed(2)}`
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow style={{ background: 'rgba(99,102,241,0.1)' }}>
                        <TableCell colSpan={2} className="font-bold text-indigo-300">TOTAL USD</TableCell>
                        <TableCell className="text-right text-indigo-300 font-black text-lg">${totalVentasDivisas.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow style={{ background: 'rgba(245,158,11,0.1)' }}>
                        <TableCell colSpan={2} className="font-bold text-amber-300">TOTAL BS</TableCell>
                        <TableCell className="text-right text-amber-300 font-black text-lg">Bs {totalVentasBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-14 h-14 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay ventas en este período</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gastos">
            <div className="p-4 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-400" /> Detalle de Gastos
              </h3>
              {loadingGastos ? (
                <Skeleton className="h-64 w-full rounded-xl bg-white/10" />
              ) : gastosFiltrados.length > 0 ? (
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Table>
                    <TableHeader>
                      <TableRow style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <TableHead className="text-slate-400">Fecha</TableHead>
                        <TableHead className="text-slate-400">Descripción</TableHead>
                        <TableHead className="text-slate-400">Categoría</TableHead>
                        <TableHead className="text-right text-slate-400">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastosFiltrados.map((gasto) => (
                        <TableRow key={gasto.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-sm text-slate-300">
                            {format(parseISO(gasto.fecha_gasto), "dd/MM/yy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium text-slate-200">{gasto.descripcion}</TableCell>
                          <TableCell>
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{gasto.categoria}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-400">
                            {metodosBolivares(gasto.metodo_pago)
                              ? `Bs ${(gasto.monto_original || gasto.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `$${gasto.monto.toFixed(2)}`
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow style={{ background: 'rgba(99,102,241,0.1)' }}>
                        <TableCell colSpan={3} className="font-bold text-indigo-300">TOTAL USD</TableCell>
                        <TableCell className="text-right text-indigo-300 font-black text-lg">${totalGastosDivisas.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow style={{ background: 'rgba(245,158,11,0.1)' }}>
                        <TableCell colSpan={3} className="font-bold text-amber-300">TOTAL BS</TableCell>
                        <TableCell className="text-right text-amber-300 font-black text-lg">Bs {totalGastosBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-14 h-14 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay gastos en este período</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
