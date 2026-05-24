import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  FileSpreadsheet,
  RefreshCw, 
  DollarSign,
  Receipt,
  Loader2,
  ChefHat,
  CreditCard
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, parse, isWithinInterval } from "date-fns";
import { toast } from "sonner";

export default function ReporteMensual() {
  const [mesSeleccionado, setMesSeleccionado] = useState(format(new Date(), 'yyyy-MM'));
  const [generando, setGenerando] = useState(false);
  const [reporte, setReporte] = useState(null);

  // --- Data Fetching ---
  const { data: ventas = [], isLoading: lv } = useQuery({
    queryKey: ['ventas'], queryFn: () => base44.entities.Venta.list('-created_date', 1000),
  });
  const { data: gastos = [], isLoading: lg } = useQuery({
    queryKey: ['gastos'], queryFn: () => base44.entities.Gasto.list('-created_date', 1000),
  });
  const { data: pagosMixtos = [] } = useQuery({
    queryKey: ['pagos-mixtos'], queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
  });
  const { data: comandas = [] } = useQuery({
    queryKey: ['comandas'], queryFn: () => base44.entities.Comanda.list('-created_date', 500),
  });
  const { data: adelantos = [], isLoading: la } = useQuery({
    queryKey: ['adelantos'], queryFn: () => base44.entities.Adelanto.list('-created_date', 1000),
  });
  const { data: pagosCuentas = [], isLoading: lp } = useQuery({
    queryKey: ['pagos-cuentas'], queryFn: () => base44.entities.PagoCuentaPorCobrar.list('-created_date', 1000),
  });

  const isLoading = lv || lg || la || lp;

  const metodosConfig = {
    efectivo_usd: { label: "Efectivo USD" },
    binance_usd: { label: "Binance" },
    zinli_usd: { label: "Zinli" },
    paypal_usd: { label: "PayPal" },
    zelle_usd: { label: "Zelle" },
    efectivo_cop: { label: "Efectivo COP" },
    nequi_cop: { label: "Nequi" },
    tarjeta_bs: { label: "Tarjeta Bs" },
    pago_movil_bs: { label: "Pago Móvil" }
  };

  const generarReporte = () => {
    setGenerando(true);
    try {
      const fechaBase = parse(mesSeleccionado, 'yyyy-MM', new Date());
      const intervalo = { start: startOfMonth(fechaBase), end: endOfMonth(fechaBase) };

      // 1. Filtros iniciales por fecha
      const vMes = ventas.filter(v => v.fecha_hora && isWithinInterval(parseISO(v.fecha_hora), intervalo));
      const gMes = gastos.filter(g => g.fecha_gasto && isWithinInterval(parseISO(g.fecha_gasto), intervalo));
      const aMes = adelantos.filter(a => a.fecha_adelanto && isWithinInterval(parseISO(a.fecha_adelanto), intervalo));
      const cMes = comandas.filter(c => c.estado === 'pagada' && isWithinInterval(parseISO(c.fecha_cierre || c.fecha_apertura), intervalo));
      const pMes = pagosCuentas.filter(p => {
        try {
          return isWithinInterval(parseISO(p.fecha_pago || p.createdAt), intervalo);
        } catch {
          return false;
        }
      });

      // 2. Lógica de cálculo por moneda
      const esBs = (m) => m?.endsWith('_bs');

      const totales = {
        vDiv: vMes.filter(v => !esBs(v.metodo_pago) && v.metodo_pago !== 'mixto').reduce((s, v) => s + (v.total_venta || 0), 0) + pMes.filter(p => !esBs(p.metodo_pago)).reduce((s, p) => s + (p.monto_pagado || 0), 0),
        // Para pagos de créditos en Bs: convertir monto USD * tasa guardada
        vBs: vMes.filter(v => esBs(v.metodo_pago)).reduce((s, v) => s + (v.total_ves || 0), 0) + pMes.filter(p => esBs(p.metodo_pago)).reduce((s, p) => s + ((p.monto_pagado || 0) * (p.tasa_bs_aplicada || 1)), 0),
        gDiv: gMes.filter(g => !esBs(g.metodo_pago)).reduce((s, g) => s + (g.monto || 0), 0),
        gBs: gMes.filter(g => esBs(g.metodo_pago)).reduce((s, g) => s + (g.monto_original || g.monto || 0), 0),
        aDiv: aMes.filter(a => !esBs(a.metodo_pago)).reduce((s, a) => s + (a.monto || 0), 0),
        aBs: aMes.filter(a => esBs(a.metodo_pago)).reduce((s, a) => s + (a.monto_original || a.monto || 0), 0),
      };

      // 3. Desglose detallado de Ingresos (Maneja Mixtos)
      const ingresosMetodo = {};
      vMes.forEach(v => {
        if (v.metodo_pago === 'mixto') {
          const pagos = pagosMixtos.filter(p => p.venta_id === v.id);
          pagos.forEach(p => {
            const monto = esBs(p.metodo_pago) ? (p.monto_ves || 0) : (p.monto_usd || 0);
            ingresosMetodo[p.metodo_pago] = {
              total: (ingresosMetodo[p.metodo_pago]?.total || 0) + monto,
              cant: (ingresosMetodo[p.metodo_pago]?.cant || 0) + 1
            };
          });
        } else if (v.metodo_pago !== 'cuentas_por_cobrar') {
          const monto = esBs(v.metodo_pago) ? (v.total_ves || 0) : (v.total_venta || 0);
          ingresosMetodo[v.metodo_pago] = {
            total: (ingresosMetodo[v.metodo_pago]?.total || 0) + monto,
            cant: (ingresosMetodo[v.metodo_pago]?.cant || 0) + 1
          };
        }
      });
      pMes.forEach(p => {
        const metodo = p.metodo_pago || 'efectivo_usd';
        // Para pagos en Bs, convertir usando la tasa guardada
        const monto = esBs(metodo) ? ((p.monto_pagado || 0) * (p.tasa_bs_aplicada || 1)) : (p.monto_pagado || 0);
        ingresosMetodo[metodo] = {
          total: (ingresosMetodo[metodo]?.total || 0) + monto,
          cant: (ingresosMetodo[metodo]?.cant || 0) + 1
        };
      });

      setReporte({
        resumen: totales,
        counts: { v: vMes.length, g: gMes.length, a: aMes.length, c: cMes.length },
        ingresos: ingresosMetodo,
        mes: mesSeleccionado
      });
      toast.success("Reporte generado");
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar el reporte");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              Reporte Mensual
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Flujo de caja consolidado por moneda</p>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Input 
              type="month" 
              className="border-none focus-visible:ring-0 w-44 bg-transparent text-white" 
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
            <Button onClick={generarReporte} disabled={isLoading || generando} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25">
              {generando ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Generar Reporte
            </Button>
          </div>
        </div>

      {reporte ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Tarjetas Principales de Caja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="Balance Efectivo/Divisas" 
              value={reporte.resumen.vDiv - reporte.resumen.gDiv - reporte.resumen.aDiv}
              sub={`Ingresos: $${reporte.resumen.vDiv.toFixed(2)} | Egresos: $${(reporte.resumen.gDiv + reporte.resumen.aDiv).toFixed(2)}`}
              icon={<DollarSign className="text-blue-400 w-8 h-8" />}
              variant="blue"
              isUsd
            />
            <StatCard 
              title="Balance Banco Bolívares" 
              value={reporte.resumen.vBs - reporte.resumen.gBs - reporte.resumen.aBs}
              sub={`Ventas: Bs. ${reporte.resumen.vBs.toLocaleString('es-VE')} | Egresos: Bs. ${(reporte.resumen.gBs + reporte.resumen.aBs).toLocaleString('es-VE')}`}
              icon={<CreditCard className="text-emerald-400 w-8 h-8" />}
              variant="green"
            />
            <StatCard 
              title="Comandas Pagadas" 
              value={reporte.counts.c}
              sub="Total transacciones de mesa cerradas"
              icon={<ChefHat className="text-amber-400 w-8 h-8" />}
              variant="amber"
              noFormat
            />
          </div>

          <Tabs defaultValue="ingresos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md bg-transparent p-1">
              <TabsTrigger value="ingresos" className="text-sm data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-slate-400 rounded-xl">💰 Desglose de Ingresos</TabsTrigger>
              <TabsTrigger value="resumen" className="text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 text-slate-400 rounded-xl">📊 Resumen Operativo</TabsTrigger>
            </TabsList>

            <TabsContent value="ingresos" className="mt-4">
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-purple-400" />
                    Ventas por Método de Pago
                  </h3>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(reporte.ingresos).map(([key, data]) => {
                      const esBolivares = key.endsWith('_bs');
                      return (
                        <div key={key} className="p-4 rounded-xl border border-white/5 transition-all hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {metodosConfig[key]?.label || key}
                          </p>
                          <p className={`text-2xl font-bold mt-1 ${esBolivares ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {esBolivares 
                              ? `Bs. ${data.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
                              : `$${data.total.toFixed(2)}`
                            }
                          </p>
                          <Badge variant="secondary" className="mt-3 bg-white/10 text-slate-300 hover:bg-white/20 border-0">
                            {data.cant} ventas
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resumen" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="text-white font-semibold mb-4 text-sm">Métricas de Venta</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-300 border-b border-white/5 pb-2"><span>Transacciones totales:</span> <b className="text-white">{reporte.counts.v}</b></div>
                    <div className="flex justify-between text-slate-300"><span>Promedio por venta:</span> <b className="text-white">${(reporte.resumen.vDiv / (reporte.counts.v || 1)).toFixed(2)}</b></div>
                  </div>
                </div>
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 className="text-white font-semibold mb-4 text-sm">Métricas de Gasto</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-300 border-b border-white/5 pb-2"><span>Total Gastos:</span> <b className="text-white">{reporte.counts.g}</b></div>
                    <div className="flex justify-between text-slate-300"><span>Total Adelantos:</span> <b className="text-white">{reporte.counts.a}</b></div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="h-96 rounded-3xl flex flex-col items-center justify-center text-slate-400" style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)' }}>
          <FileSpreadsheet className="h-16 w-16 mb-4 opacity-20 text-white" />
          <p className="text-lg font-medium text-slate-300">No se ha generado ningún reporte</p>
          <p className="text-sm">Selecciona un mes arriba para comenzar</p>
        </div>
      )}
      </div>
    </div>
  );
}

// Subcomponente estilizado para las tarjetas de balance
function StatCard({ title, value, sub, icon, variant, isUsd, noFormat }) {
  const styles = {
    blue: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.05))",
    green: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))",
    amber: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))"
  };

  const borderStyles = {
    blue: "1px solid rgba(59,130,246,0.2)",
    green: "1px solid rgba(16,185,129,0.2)",
    amber: "1px solid rgba(245,158,11,0.2)"
  };

  const textStyles = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    amber: "text-amber-400"
  };

  return (
    <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: styles[variant], border: borderStyles[variant] }}>
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className={`text-xs font-bold uppercase opacity-80 tracking-tighter ${textStyles[variant]}`}>{title}</p>
          <h3 className={`text-3xl font-black ${textStyles[variant]}`}>
            {noFormat ? value : isUsd 
              ? `$${value.toFixed(2)}` 
              : `Bs. ${value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
            }
          </h3>
          <p className="text-xs font-medium mt-2 text-slate-400">{sub}</p>
        </div>
        <div className="absolute top-4 right-4 opacity-20 transform scale-150">{icon}</div>
      </div>
    </div>
  );
}
