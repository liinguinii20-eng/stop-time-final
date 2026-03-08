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

  const isLoading = lv || lg || la;

  const metodosConfig = {
    efectivo_usd: { label: "Efectivo USD" },
    binance_usd: { label: "Binance" },
    zinli_usd: { label: "Zinli" },
    paypal_usd: { label: "PayPal" },
    zelle_usd: { label: "Zelle" },
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

      // 2. Lógica de cálculo por moneda
      const esBs = (m) => m?.endsWith('_bs');

      const totales = {
        vDiv: vMes.filter(v => !esBs(v.metodo_pago) && v.metodo_pago !== 'mixto').reduce((s, v) => s + (v.total_venta || 0), 0),
        vBs: vMes.filter(v => esBs(v.metodo_pago)).reduce((s, v) => s + (v.total_ves || 0), 0),
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="text-purple-600 w-8 h-8" /> Reporte Mensual
          </h1>
          <p className="text-muted-foreground">Flujo de caja consolidado por moneda</p>
        </div>
        
        <Card className="flex items-center gap-3 p-2 shadow-sm border">
          <Input 
            type="month" 
            className="border-none focus-visible:ring-0 w-44" 
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
          />
          <Button onClick={generarReporte} disabled={isLoading || generando} className="bg-purple-600 hover:bg-purple-700">
            {generando ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Generar Reporte
          </Button>
        </Card>
      </div>

      {reporte ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Tarjetas Principales de Caja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="Balance Efectivo/Divisas" 
              value={reporte.resumen.vDiv - reporte.resumen.gDiv - reporte.resumen.aDiv}
              sub={`Ingresos: $${reporte.resumen.vDiv.toFixed(2)} | Egresos: $${(reporte.resumen.gDiv + reporte.resumen.aDiv).toFixed(2)}`}
              icon={<DollarSign className="text-blue-600" />}
              variant="blue"
              isUsd
            />
            <StatCard 
              title="Balance Banco Bolívares" 
              value={reporte.resumen.vBs - reporte.resumen.gBs - reporte.resumen.aBs}
              sub={`Ventas: Bs. ${reporte.resumen.vBs.toLocaleString('es-VE')} | Egresos: Bs. ${(reporte.resumen.gBs + reporte.resumen.aBs).toLocaleString('es-VE')}`}
              icon={<CreditCard className="text-green-600" />}
              variant="green"
            />
            <StatCard 
              title="Comandas Pagadas" 
              value={reporte.counts.c}
              sub="Total transacciones de mesa cerradas"
              icon={<ChefHat className="text-amber-600" />}
              variant="amber"
              noFormat
            />
          </div>

          <Tabs defaultValue="ingresos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="ingresos">💰 Desglose de Ingresos</TabsTrigger>
              <TabsTrigger value="resumen">📊 Resumen Operativo</TabsTrigger>
            </TabsList>

            <TabsContent value="ingresos" className="mt-4">
              <Card className="shadow-lg">
                <CardHeader className="bg-white border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-purple-600" />
                    Ventas por Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(reporte.ingresos).map(([key, data]) => {
                      const esBolivares = key.endsWith('_bs');
                      return (
                        <div key={key} className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {metodosConfig[key]?.label || key}
                          </p>
                          <p className={`text-2xl font-bold mt-1 ${esBolivares ? 'text-green-600' : 'text-blue-600'}`}>
                            {esBolivares 
                              ? `Bs. ${data.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
                              : `$${data.total.toFixed(2)}`
                            }
                          </p>
                          <Badge variant="secondary" className="mt-2 font-normal">
                            {data.cant} ventas
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resumen">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Métricas de Venta</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between"><span>Transacciones totales:</span> <b>{reporte.counts.v}</b></div>
                    <div className="flex justify-between"><span>Promedio por venta:</span> <b>${(reporte.resumen.vDiv / (reporte.counts.v || 1)).toFixed(2)}</b></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Métricas de Gasto</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between"><span>Total Gastos:</span> <b>{reporte.counts.g}</b></div>
                    <div className="flex justify-between"><span>Total Adelantos:</span> <b>{reporte.counts.a}</b></div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="h-96 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
          <FileSpreadsheet className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No se ha generado ningún reporte</p>
          <p className="text-sm">Selecciona un mes arriba para comenzar</p>
        </div>
      )}
    </div>
  );
}

// Subcomponente estilizado para las tarjetas de balance
function StatCard({ title, value, sub, icon, variant, isUsd, noFormat }) {
  const styles = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900"
  };

  return (
    <Card className={`${styles[variant]} border shadow-md`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase opacity-70 tracking-tighter">{title}</p>
            <h3 className="text-3xl font-black">
              {noFormat ? value : isUsd 
                ? `$${value.toFixed(2)}` 
                : `Bs. ${value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
              }
            </h3>
            <p className="text-[10px] font-medium leading-none mt-2 opacity-80">{sub}</p>
          </div>
          <div className="p-3 bg-white rounded-xl shadow-sm">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
