import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, TrendingUp, DollarSign, FileSpreadsheet, Eye } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ReportesMetodosPago() {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const data = await base44.entities.Venta.list('-created_date', 500);
      console.log('✅ Ventas cargadas:', data.length);
      return data;
    },
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: async () => {
      const data = await base44.entities.PagoMixto.list('-created_date', 1000);
      console.log('✅ Pagos mixtos cargados:', data.length);
      return data;
    },
  });

  const { data: pagosCuentas = [], isLoading: loadingPagosCuentas } = useQuery({
    queryKey: ['pagos-cuentas'],
    queryFn: async () => {
      const data = await base44.entities.PagoCuentaPorCobrar.list('-created_date', 1000);
      console.log('✅ Pagos de créditos cargados:', data.length);
      return data;
    },
  });

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

  const metodosConfig = {
    efectivo_usd: { label: "💵 Efectivo USD", moneda: "usd", grupo: "dólares" },
    binance_usd: { label: "📱 Binance", moneda: "usd", grupo: "dólares" },
    zinli_usd: { label: "📱 Zinli", moneda: "usd", grupo: "dólares" },
    paypal_usd: { label: "🌐 PayPal", moneda: "usd", grupo: "dólares" },
    zelle_usd: { label: "🏦 Zelle", moneda: "usd", grupo: "dólares" },
    efectivo_cop: { label: "💵 Efectivo COP", moneda: "cop", grupo: "pesos" },
    nequi_cop: { label: "📱 Nequi", moneda: "cop", grupo: "pesos" },
    tarjeta_bs: { label: "💳 Tarjeta Bs", moneda: "ves", grupo: "bolívares" },
    pago_movil_bs: { label: "📱 Pago Móvil", moneda: "ves", grupo: "bolívares" }
  };

  // Calcular totales por método
  const calcularTotales = () => {
    const totales = {};
    
    // Inicializar totales
    Object.keys(metodosConfig).forEach(metodo => {
      totales[metodo] = { total_usd: 0, cantidad: 0, total_original: 0 };
    });

    // Ventas simples (no mixtas)
    ventasFiltradas.forEach(venta => {
      if (venta.metodo_pago !== 'mixto' && totales[venta.metodo_pago]) {
        totales[venta.metodo_pago].total_usd += venta.total_venta;
        totales[venta.metodo_pago].cantidad += 1;
        
        if (metodosConfig[venta.metodo_pago].moneda === 'cop') {
          totales[venta.metodo_pago].total_original += venta.total_cop || (venta.total_venta * 4000);
        } else if (metodosConfig[venta.metodo_pago].moneda === 'ves') {
          totales[venta.metodo_pago].total_original += venta.total_ves || 0;
        } else {
          totales[venta.metodo_pago].total_original += venta.total_venta;
        }
      }
    });

    // Pagos mixtos
    const ventasIds = ventasFiltradas.map(v => v.id);
    pagosMixtos.forEach(pago => {
      if (ventasIds.includes(pago.venta_id) && totales[pago.metodo_pago]) {
        totales[pago.metodo_pago].total_usd += pago.monto_usd;
        totales[pago.metodo_pago].cantidad += 1;
        totales[pago.metodo_pago].total_original += pago.monto_original;
      }
    });

    // Pagos de cuentas por cobrar (créditos)
    pagosCuentasFiltrados.forEach(pago => {
      const metodo = pago.metodo_pago || 'efectivo_usd';
      if (totales[metodo]) {
        const esBs = metodo.endsWith('_bs');
        totales[metodo].total_usd += esBs ? 0 : (pago.monto_pagado || 0);
        totales[metodo].cantidad += 1;
        totales[metodo].total_original += pago.monto_pagado || 0;
      }
    });

    return totales;
  };

  const totales = calcularTotales();

  const agruparPorMoneda = () => {
    const grupos = { dólares: [], pesos: [], bolívares: [] };
    
    Object.entries(metodosConfig).forEach(([key, config]) => {
      if (totales[key].cantidad > 0) {
        grupos[config.grupo].push({ key, ...config, ...totales[key] });
      }
    });

    return grupos;
  };

  const grupos = agruparPorMoneda();

  const totalGeneral = Object.values(totales).reduce((sum, t) => sum + t.total_usd, 0);
  const cantidadTotal = Object.values(totales).reduce((sum, t) => sum + t.cantidad, 0);
  const promedioVenta = cantidadTotal > 0 ? totalGeneral / cantidadTotal : 0;

  const isLoading = loadingVentas || loadingPagos || loadingPagosCuentas;

  const exportarExcel = () => {
    const rows = [
      ["REPORTE DE MÉTODOS DE PAGO"],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["Método de Pago", "Cantidad Ventas", "Total USD", "Total Moneda Original"],
    ];

    Object.entries(metodosConfig).forEach(([key, config]) => {
      if (totales[key].cantidad > 0) {
        rows.push([
          config.label,
          totales[key].cantidad,
          `$${totales[key].total_usd.toFixed(2)}`,
          `${totales[key].total_original.toFixed(2)}`
        ]);
      }
    });

    rows.push([]);
    rows.push(["TOTAL GENERAL", cantidadTotal, `$${totalGeneral.toFixed(2)}`, ""]);

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_metodos_pago_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado exitosamente");
  };

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
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              Reportes por Método de Pago
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Análisis detallado de ingresos por canal</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider">Total USD</p>
            <p className="text-3xl font-black mt-1 text-emerald-400">${totalGeneral.toFixed(2)}</p>
            <DollarSign className="absolute top-4 right-4 w-12 h-12 text-emerald-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-blue-400/70 text-xs font-bold uppercase tracking-wider">Total Ventas</p>
            <p className="text-3xl font-black mt-1 text-blue-400">{cantidadTotal}</p>
            <CreditCard className="absolute top-4 right-4 w-12 h-12 text-blue-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">Promedio</p>
            <p className="text-3xl font-black mt-1 text-amber-400">${promedioVenta.toFixed(2)}</p>
            <TrendingUp className="absolute top-4 right-4 w-12 h-12 text-amber-500/20" />
          </div>
        </div>

        {/* Métodos en Dólares */}
        {grupos.dólares.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-500/20 to-transparent border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">💵 Métodos en Dólares</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {grupos.dólares.map(metodo => (
                <div key={metodo.key} className="flex justify-between items-center p-4 rounded-xl transition-colors hover:bg-white/5 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{metodo.label}</p>
                    <p className="text-sm text-slate-400">{metodo.cantidad} ventas • Promedio: ${(metodo.total_usd / metodo.cantidad).toFixed(2)}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xl font-bold text-emerald-400">
                      ${metodo.total_usd.toFixed(2)}
                    </p>
                  </div>
                  <Link to={createPageUrl(`ReporteDetalle?metodo=${metodo.key}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                    <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/10">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalle
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métodos en Pesos */}
        {grupos.pesos.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-4 sm:p-6 bg-gradient-to-r from-cyan-500/20 to-transparent border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🇨🇴 Métodos en Pesos</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {grupos.pesos.map(metodo => (
                <div key={metodo.key} className="flex justify-between items-center p-4 rounded-xl transition-colors hover:bg-white/5 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{metodo.label}</p>
                    <p className="text-sm text-slate-400">{metodo.cantidad} ventas • Promedio: ${(metodo.total_usd / metodo.cantidad).toFixed(2)}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xl font-bold text-cyan-400">
                      ${metodo.total_usd.toFixed(2)}
                    </p>
                    <p className="text-sm text-cyan-300/60">
                      ₡ {metodo.total_original.toLocaleString('es-ES')}
                    </p>
                  </div>
                  <Link to={createPageUrl(`ReporteDetalle?metodo=${metodo.key}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                    <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/10">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalle
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métodos en Bolívares */}
        {grupos.bolívares.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/20 to-transparent border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🇻🇪 Métodos en Bolívares</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {grupos.bolívares.map(metodo => (
                <div key={metodo.key} className="flex justify-between items-center p-4 rounded-xl transition-colors hover:bg-white/5 border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{metodo.label}</p>
                    <p className="text-sm text-slate-400">{metodo.cantidad} ventas • Promedio: ${(metodo.total_usd / metodo.cantidad).toFixed(2)}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xl font-bold text-amber-400">
                      Bs {metodo.total_original.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-amber-300/60">
                      (${metodo.total_usd.toFixed(2)} equiv.)
                    </p>
                  </div>
                  <Link to={createPageUrl(`ReporteDetalle?metodo=${metodo.key}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                    <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/10">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalle
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
