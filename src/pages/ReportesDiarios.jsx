import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  FileSpreadsheet,
  RefreshCw, 
  DollarSign,
  Receipt,
  ShoppingCart,
  Loader2,
  ChefHat,
  CreditCard,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ReportesDiarios() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [generando, setGenerando] = useState(false);
  const [reporte, setReporte] = useState(null);

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Venta.list('-created_date', 1000),
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 1000),
  });

  const { data: pagosMixtos = [] } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
  });

  const { data: comandas = [] } = useQuery({
    queryKey: ['comandas'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 500),
  });

  const { data: detallesComandas = [] } = useQuery({
    queryKey: ['detalles-comandas'],
    queryFn: () => base44.entities.DetalleComanda.list('-created_date', 2000),
  });

  const { data: adelantos = [], isLoading: loadingAdelantos } = useQuery({
    queryKey: ['adelantos'],
    queryFn: () => base44.entities.Adelanto.list('-created_date', 1000),
  });

  const metodosConfig = {
    efectivo_usd: { label: "Efectivo USD", grupo: "USD" },
    binance_usd: { label: "Binance", grupo: "USD" },
    zinli_usd: { label: "Zinli", grupo: "USD" },
    paypal_usd: { label: "PayPal", grupo: "USD" },
    zelle_usd: { label: "Zelle", grupo: "USD" },
    efectivo_cop: { label: "Efectivo COP", grupo: "COP" },
    nequi_cop: { label: "Nequi", grupo: "COP" },
    tarjeta_bs: { label: "Tarjeta Bs", grupo: "VES" },
    pago_movil_bs: { label: "Pago Móvil", grupo: "VES" }
  };

  const metodosBolivares = (metodo) => metodo && metodo.endsWith('_bs');
  const metodosDivisas = (metodo) => metodo && !metodo.endsWith('_bs') && !['cuentas_por_cobrar', 'mixto'].includes(metodo);

  const generarReporte = () => {
    setGenerando(true);
    
    try {
      const fechaInicio = startOfDay(parseISO(fechaSeleccionada + 'T00:00:00'));
      const fechaFin = endOfDay(parseISO(fechaSeleccionada + 'T23:59:59'));

      // Filtrar ventas del día
      const ventasDia = ventas.filter(v => {
        try {
          const fechaVenta = parseISO(v.fecha_hora);
          return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
        } catch {
          return false;
        }
      });

      // Filtrar gastos normales del día
      const gastosNormales = gastos.filter(g => {
        try {
          const fechaGasto = parseISO(g.fecha_gasto || g.fecha);
          return fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
        } catch {
          return false;
        }
      });

      // Filtrar adelantos del día y agregarlos como gastos
      const adelantosDia = adelantos.filter(a => {
        try {
          const fechaA = parseISO(a.fecha_adelanto || a.fecha || a.createdAt);
          return fechaA >= fechaInicio && fechaA <= fechaFin;
        } catch {
          return false;
        }
      });

      const adelantosMapeados = adelantosDia.map(a => ({
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

      const gastosDia = [...gastosNormales, ...adelantosMapeados];

      // Filtrar comandas pagadas del día
      const comandasDia = comandas.filter(c => {
        try {
          if (c.estado !== 'pagada') return false;
          const fechaComanda = parseISO(c.fecha_cierre || c.fecha_apertura);
          return fechaComanda >= fechaInicio && fechaComanda <= fechaFin;
        } catch {
          return false;
        }
      });

      // Calcular totales separados - SIN CONVERSIÓN
      const totalVentasDivisas = ventasDia.filter(v => metodosDivisas(v.metodo_pago)).reduce((sum, v) => sum + (v.total_venta || 0), 0);
      const totalVentasBolivares = ventasDia.filter(v => metodosBolivares(v.metodo_pago)).reduce((sum, v) => sum + (v.total_ves || 0), 0);
      
      const totalGastosDivisas = gastosDia.filter(g => metodosDivisas(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
      const totalGastosBolivares = gastosDia.filter(g => metodosBolivares(g.metodo_pago)).reduce((sum, g) => sum + (g.monto_original || g.monto || 0), 0);

      const netoDivisas = totalVentasDivisas - totalGastosDivisas;
      const netoBolivares = totalVentasBolivares - totalGastosBolivares;

      // Ventas por método de pago (con comandas asociadas)
      const ventasPorMetodo = {};
      const detallesVentas = [];

      // 1. Procesar ventas normales (no mixtas)
      ventasDia.forEach(venta => {
        if (venta.metodo_pago && venta.metodo_pago !== 'mixto') {
          if (!ventasPorMetodo[venta.metodo_pago]) {
            ventasPorMetodo[venta.metodo_pago] = { cantidad: 0, total: 0, comandas: [] };
          }
          ventasPorMetodo[venta.metodo_pago].cantidad += 1;
          ventasPorMetodo[venta.metodo_pago].total += venta.total_venta || 0;
          ventasPorMetodo[venta.metodo_pago].total_ves = (ventasPorMetodo[venta.metodo_pago].total_ves || 0) + (venta.total_ves || 0);
          
          // Buscar comanda asociada
          const comandaAsociada = comandasDia.find(c => 
            Math.abs(c.total_comanda - venta.total_venta) < 0.01
          );
          if (comandaAsociada) {
            ventasPorMetodo[venta.metodo_pago].comandas.push({
              numero: comandaAsociada.numero_comanda,
              mesa: comandaAsociada.mesa_numero,
              total: venta.total_venta,
              hora: format(parseISO(venta.fecha_hora), 'HH:mm', { locale: es })
            });
          }

          // Agregar a detalles
          detallesVentas.push({
             id: venta.id,
             hora: format(parseISO(venta.fecha_hora), 'HH:mm', { locale: es }),
             metodo_pago: venta.metodo_pago,
             total: venta.total_venta,
             total_cop: venta.total_cop,
             total_ves: venta.total_ves,
             es_parte_mixto: false
          });
        }
      });

      // 2. Procesar pagos mixtos
      // Identificar ventas mixtas del día
      const ventasMixtasDia = ventasDia.filter(v => v.metodo_pago === 'mixto');
      const ventasMixtasIds = ventasMixtasDia.map(v => v.id);
      
      // Filtrar pagos mixtos relevantes
      const pagosMixtosDia = pagosMixtos.filter(p => ventasMixtasIds.includes(p.venta_id));

      pagosMixtosDia.forEach(pago => {
          if (!ventasPorMetodo[pago.metodo_pago]) {
            ventasPorMetodo[pago.metodo_pago] = { cantidad: 0, total: 0, comandas: [] };
          }
          ventasPorMetodo[pago.metodo_pago].cantidad += 1;
          ventasPorMetodo[pago.metodo_pago].total += pago.monto_usd || 0;
          
          // Buscar la venta original y su comanda
          const ventaOriginal = ventasDia.find(v => v.id === pago.venta_id);
          if (ventaOriginal) {
            const comandaAsociada = comandasDia.find(c => 
              Math.abs(c.total_comanda - ventaOriginal.total_venta) < 0.01
            );
            if (comandaAsociada) {
              ventasPorMetodo[pago.metodo_pago].comandas.push({
                numero: comandaAsociada.numero_comanda,
                mesa: comandaAsociada.mesa_numero,
                total: pago.monto_usd,
                hora: format(parseISO(ventaOriginal.fecha_hora), 'HH:mm', { locale: es }),
                esMixto: true
              });
            }

            // Agregar a detalles (desglosado)
            detallesVentas.push({
               id: pago.id,
               hora: format(parseISO(ventaOriginal.fecha_hora), 'HH:mm', { locale: es }),
               metodo_pago: pago.metodo_pago,
               total: pago.monto_usd,
               total_cop: pago.moneda === 'cop' ? pago.monto_original : 0,
               total_ves: pago.moneda === 'ves' ? pago.monto_original : 0,
               es_parte_mixto: true,
               venta_id: ventaOriginal.id
            });
          }
      });

      // Ordenar detalles por hora
      detallesVentas.sort((a, b) => a.hora.localeCompare(b.hora));

      // Gastos por categoría - separado por moneda
      const gastosPorCategoria = {};
      gastosDia.forEach(gasto => {
        const cat = gasto.categoria || 'Otros';
        if (!gastosPorCategoria[cat]) {
          gastosPorCategoria[cat] = { 
            cantidad: 0, 
            total_usd: 0,
            total_bs: 0
          };
        }
        gastosPorCategoria[cat].cantidad += 1;
        if (metodosBolivares(gasto.metodo_pago)) {
          gastosPorCategoria[cat].total_bs += gasto.monto_original || gasto.monto || 0;
        } else {
          gastosPorCategoria[cat].total_usd += gasto.monto || 0;
        }
      });

      // Gastos por método de pago - moneda correcta
      const gastosPorMetodo = {};
      gastosDia.forEach(gasto => {
        const metodo = gasto.metodo_pago || 'efectivo_usd';
        if (!gastosPorMetodo[metodo]) {
          gastosPorMetodo[metodo] = { 
            cantidad: 0, 
            total_usd: 0,
            total_bs: 0
          };
        }
        gastosPorMetodo[metodo].cantidad += 1;
        if (metodosBolivares(metodo)) {
          gastosPorMetodo[metodo].total_bs += gasto.monto_original || gasto.monto || 0;
        } else {
          gastosPorMetodo[metodo].total_usd += gasto.monto || 0;
        }
      });

      // Detalles de comandas con platos
      const comandasDetalladas = comandasDia.map(comanda => {
        const detalles = detallesComandas.filter(d => d.comanda_id === comanda.id);
        return {
          id: comanda.id,
          numero_comanda: comanda.numero_comanda,
          mesa: comanda.mesa_numero,
          mesero: comanda.mesero_nombre,
          total: comanda.total_comanda,
          total_cop: comanda.total_cop,
          total_ves: comanda.total_ves,
          hora_apertura: comanda.fecha_apertura ? format(parseISO(comanda.fecha_apertura), 'HH:mm', { locale: es }) : 'N/A',
          hora_cierre: comanda.fecha_cierre ? format(parseISO(comanda.fecha_cierre), 'HH:mm', { locale: es }) : 'N/A',
          platos: detalles.map(d => ({
            nombre: d.plato_nombre,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal
          })),
          cantidad_platos: detalles.reduce((sum, d) => sum + d.cantidad, 0)
        };
      });

      setReporte({
        fecha: fechaSeleccionada,
        resumen: {
          cantidad_ventas: ventasDia.length,
          cantidad_gastos: gastosDia.length,
          cantidad_comandas: comandasDia.length,
          // Segregación por moneda
          total_divisas: totalVentasDivisas,
          total_bolivares: totalVentasBolivares,
          gastos_divisas: totalGastosDivisas,
          gastos_bolivares: totalGastosBolivares,
          neto_divisas: netoDivisas,
          neto_bolivares: netoBolivares
        },
        ventas: {
          total_divisas: totalVentasDivisas,
          total_bolivares: totalVentasBolivares,
          por_metodo: ventasPorMetodo,
          detalle: detallesVentas
        },
        comandas: {
          detalladas: comandasDetalladas
        },
        gastos: {
          total_divisas: totalGastosDivisas,
          total_bolivares: totalGastosBolivares,
          por_categoria: gastosPorCategoria,
          por_metodo: gastosPorMetodo,
          detalle: gastosDia.map(g => ({
            id: g.id,
            descripcion: g.descripcion,
            categoria: g.categoria,
            monto: g.monto,
            metodo_pago: g.metodo_pago,
            comprobante: g.comprobante
          }))
        },
        generado_en: new Date().toISOString()
      });

      toast.success("Reporte generado correctamente");
    } catch (error) {
      console.error("Error generando reporte:", error);
      toast.error("Error al generar el reporte");
    } finally {
      setGenerando(false);
    }
  };

  const exportarCSV = () => {
    if (!reporte) {
      toast.error("Primero genera un reporte");
      return;
    }

    // BOM para compatibilidad con Excel (acentos y caracteres especiales)
    let contenido = '\uFEFF';
    
    // Encabezado del Reporte
    contenido += `REPORTE DIARIO DE OPERACIONES - STOP TIME SUSHI\n`;
    contenido += `Fecha del Reporte: ${reporte.fecha}\n`;
    contenido += `Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}\n\n`;
    
    // 1. RESUMEN EJECUTIVO
    contenido += '1. RESUMEN EJECUTIVO\n';
    contenido += 'Concepto,Valor\n';
    contenido += `Ventas USD,$${reporte.resumen.total_divisas.toFixed(2)}\n`;
    contenido += `Ventas Bs,Bs ${reporte.resumen.total_bolivares.toFixed(2)}\n`;
    contenido += `Gastos USD,$${reporte.resumen.gastos_divisas.toFixed(2)}\n`;
    contenido += `Gastos Bs,Bs ${reporte.resumen.gastos_bolivares.toFixed(2)}\n`;
    contenido += `Neto USD,$${reporte.resumen.neto_divisas.toFixed(2)}\n`;
    contenido += `Neto Bs,Bs ${reporte.resumen.neto_bolivares.toFixed(2)}\n`;
    contenido += `Total Transacciones Venta,${reporte.resumen.cantidad_ventas}\n`;
    contenido += `Total Transacciones Gasto,${reporte.resumen.cantidad_gastos}\n`;
    contenido += `Comandas Cerradas,${reporte.resumen.cantidad_comandas || 0}\n\n`;

    // 2. DESGLOSE DE INGRESOS
    contenido += '2. DESGLOSE DE INGRESOS POR MÉTODO DE PAGO\n';
    contenido += 'Método de Pago,Cantidad Transacciones,Total Recibido (USD)\n';
    Object.entries(reporte.ventas.por_metodo).forEach(([metodo, data]) => {
      const nombreMetodo = metodosConfig[metodo]?.label || metodo;
      contenido += `${nombreMetodo},${data.cantidad},$${data.total.toFixed(2)}\n`;
    });
    contenido += `TOTAL INGRESOS USD,,$${reporte.resumen.total_divisas.toFixed(2)}\n`;
    contenido += `TOTAL INGRESOS BS,,Bs ${reporte.resumen.total_bolivares.toFixed(2)}\n\n`;

    // 3. PAGOS MIXTOS
    const ventasMixtas = reporte.ventas.detalle.filter(v => v.es_parte_mixto);
    if (ventasMixtas.length > 0) {
      contenido += '3. DETALLE DE PAGOS MIXTOS (Desglose de Monedas)\n';
      contenido += 'ID Venta,Hora,Método Específico,Monto USD,Monto Original\n';
      ventasMixtas.forEach(v => {
         const montoOriginal = v.total_cop ? `${v.total_cop.toLocaleString()} COP` : 
                               v.total_ves ? `${v.total_ves.toLocaleString()} Bs` : 
                               `$${v.total.toFixed(2)}`;
         contenido += `${v.venta_id || v.id},${v.hora},${metodosConfig[v.metodo_pago]?.label || v.metodo_pago},$${v.total.toFixed(2)},"${montoOriginal}"\n`;
      });
      contenido += '\n';
    }

    // 4. DETALLE DE COMANDAS
    if (reporte.comandas?.detalladas?.length > 0) {
      contenido += '4. DETALLE OPERATIVO DE COMANDAS\n';
      contenido += 'N° Comanda,Mesa,Mesero,Hora Cierre,Total USD,Resumen Platos\n';
      reporte.comandas.detalladas.forEach(c => {
        // Resumen de platos en una sola celda para limpieza
        const resumenPlatos = c.platos.map(p => `${p.cantidad}x ${p.nombre}`).join(' | ');
        contenido += `${c.numero_comanda},${c.mesa},${c.mesero},${c.hora_cierre},$${c.total?.toFixed(2) || 0},"${resumenPlatos}"\n`;
      });
      contenido += '\n';
    }

    // 5. GASTOS
    contenido += '5. GASTOS OPERATIVOS DETALLADOS\n';
    contenido += 'Descripción,Categoría,Método Pago,Monto USD,Comprobante\n';
    reporte.gastos.detalle.forEach(g => {
      const descripcion = g.descripcion.replace(/"/g, '""'); // Escapar comillas para CSV
      contenido += `"${descripcion}",${g.categoria},${metodosConfig[g.metodo_pago]?.label || g.metodo_pago},$${g.monto?.toFixed(2) || 0},"${g.comprobante || ''}"\n`;
    });
    contenido += `TOTAL GASTOS USD,,,$${reporte.resumen.gastos_divisas.toFixed(2)},\n`;
    contenido += `TOTAL GASTOS BS,,,Bs ${reporte.resumen.gastos_bolivares.toFixed(2)},\n`;

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Diario_${reporte.fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Reporte Excel (CSV) exportado con formato mejorado");
  };



  const isLoading = loadingVentas || loadingGastos || loadingAdelantos;

  const [comandasAbiertas, setComandasAbiertas] = useState({});
  const [metodosAbiertos, setMetodosAbiertos] = useState({});

  const toggleComanda = (id) => {
    setComandasAbiertas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleMetodo = (metodo) => {
    setMetodosAbiertos(prev => ({
      ...prev,
      [metodo]: !prev[metodo]
    }));
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              Reportes Diarios
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Genera y exporta reportes detallados de ventas y gastos</p>
          </div>
          {reporte && (
            <Button onClick={exportarCSV} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>

        {/* Configuración */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h3 className="text-white font-semibold">Configuración del Reporte</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-slate-400 text-xs">Fecha del Reporte</Label>
              <Input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="bg-white/10 border-white/10 text-white"
              />
            </div>
            <Button 
              onClick={generarReporte} 
              disabled={generando || isLoading}
              className="bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25"
            >
              {generando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generar Reporte
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Resumen del Día */}
        {reporte && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Divisas */}
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider">💵 TOTAL CAJA USD</p>
                <p className={`text-3xl font-black mt-1 ${reporte.resumen.neto_divisas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${reporte.resumen.neto_divisas.toFixed(2)}</p>
                <div className="flex gap-4 mt-3 text-xs">
                  <span className="text-emerald-300/60">▲ ${reporte.resumen.total_divisas.toFixed(2)}</span>
                  <span className="text-red-300/60">▼ ${reporte.resumen.gastos_divisas.toFixed(2)}</span>
                </div>
              </div>

              {/* Total Bolívares */}
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                <p className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">💳 TOTAL BANCO BS</p>
                <p className={`text-3xl font-black mt-1 ${reporte.resumen.neto_bolivares >= 0 ? 'text-amber-400' : 'text-red-400'}`}>Bs {reporte.resumen.neto_bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                <div className="flex gap-4 mt-3 text-xs">
                  <span className="text-amber-300/60">▲ Bs {reporte.resumen.total_bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  <span className="text-red-300/60">▼ Bs {reporte.resumen.gastos_bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Comandas */}
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                <p className="text-indigo-400/70 text-xs font-bold uppercase tracking-wider">🍽️ Comandas</p>
                <p className="text-3xl font-black mt-1 text-indigo-400">{reporte.resumen.cantidad_comandas || 0}</p>
                <p className="text-xs text-indigo-300/60 mt-3">comandas pagadas</p>
              </div>
            </div>

            {/* Tabs para detalles */}
            <Tabs defaultValue="metodos" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-transparent p-1">
                <TabsTrigger value="metodos" className="text-xs sm:text-sm data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-slate-400 rounded-xl">💳 Métodos</TabsTrigger>
                <TabsTrigger value="comandas" className="text-xs sm:text-sm data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-slate-400 rounded-xl">🍽️ Comandas</TabsTrigger>
                <TabsTrigger value="gastos" className="text-xs sm:text-sm data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300 text-slate-400 rounded-xl">💸 Gastos</TabsTrigger>
                <TabsTrigger value="detalle" className="text-xs sm:text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 text-slate-400 rounded-xl">📋 Detalle</TabsTrigger>
              </TabsList>

              {/* Tab Métodos de Pago */}
              <TabsContent value="metodos" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ventas por Método */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Ventas por Método de Pago
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {Object.keys(reporte.ventas.por_metodo).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(reporte.ventas.por_metodo).map(([metodo, data]) => (
                            <Collapsible key={metodo} open={metodosAbiertos[metodo]}>
                              <CollapsibleTrigger 
                                onClick={() => toggleMetodo(metodo)}
                                className="w-full"
                              >
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    {metodosAbiertos[metodo] ? (
                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="font-medium">{metodosConfig[metodo]?.label || metodo}</span>
                                    <Badge className="bg-gray-200 text-gray-700">{data.cantidad}</Badge>
                                  </div>
                                  <span className="font-bold text-green-600">
                                    {metodosBolivares(metodo)
                                      ? `Bs ${(data.total_ves || data.total || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                      : `$${data.total.toFixed(2)}`
                                    }
                                  </span>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                {data.comandas && data.comandas.length > 0 ? (
                                  <div className="ml-6 mt-2 p-3 bg-white border rounded-lg space-y-2">
                                    {data.comandas.map((cmd, idx) => (
                                      <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-amber-600">🧾</span>
                                          <span className="font-medium">{cmd.numero}</span>
                                          <span className="text-gray-500">Mesa {cmd.mesa}</span>
                                          <span className="text-gray-400 text-xs">{cmd.hora}</span>
                                          {cmd.esMixto && <Badge variant="outline" className="text-xs">Mixto</Badge>}
                                        </div>
                                        <span className="font-semibold text-green-600">${cmd.total?.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="ml-6 mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
                                    No se encontraron comandas asociadas
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">No hay ventas registradas</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Gastos por Método */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Gastos por Método de Pago
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {Object.keys(reporte.gastos.por_metodo).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(reporte.gastos.por_metodo).map(([metodo, data]) => {
                            const config = metodosConfig[metodo];

                            return (
                              <div key={metodo} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{config?.label || metodo}</span>
                                    <Badge className="bg-red-200 text-red-800">{data.cantidad}</Badge>
                                  </div>
                                  <div className="text-right">
                                    {metodosBolivares(metodo) ? (
                                      <>
                                        <p className="text-2xl font-bold text-red-600">Bs {(data.total_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-gray-500 mt-1">Bolívares</p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-2xl font-bold text-red-600">${data.total_usd.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Dólares</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">No hay gastos registrados</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Resumen Neto por Método */}
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Balance Neto por Método de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(() => {
                        const todosMetodos = new Set([
                          ...Object.keys(reporte.ventas.por_metodo),
                          ...Object.keys(reporte.gastos.por_metodo)
                        ]);
                        return [...todosMetodos].map(metodo => {
                          const esBs = metodosBolivares(metodo);
                          const ventas = esBs 
                            ? (reporte.ventas.por_metodo[metodo]?.total_ves || reporte.ventas.por_metodo[metodo]?.total || 0)
                            : (reporte.ventas.por_metodo[metodo]?.total || 0);
                          const gastos = esBs
                            ? (reporte.gastos.por_metodo[metodo]?.total_bs || 0)
                            : (reporte.gastos.por_metodo[metodo]?.total_usd || 0);
                          const neto = ventas - gastos;
                          const simbolo = esBs ? 'Bs' : '$';
                          const formatVal = (v) => esBs 
                            ? `Bs ${v.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
                            : `$${v.toFixed(2)}`;
                          return (
                            <div key={metodo} className={`p-4 rounded-lg border-2 ${neto >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                              <p className="text-sm font-medium text-gray-700">{metodosConfig[metodo]?.label || metodo}</p>
                              <div className="mt-2 space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">📥 Ventas:</span>
                                  <span className="text-green-600 font-medium">{formatVal(ventas)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">📤 Gastos:</span>
                                  <span className="text-red-600 font-medium">{formatVal(gastos)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t">
                                  <span className="font-semibold">💰 Neto:</span>
                                  <span className={`font-bold ${neto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatVal(neto)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Comandas */}
              <TabsContent value="comandas" className="space-y-4">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ChefHat className="w-5 h-5" />
                      Detalle de Comandas ({reporte.comandas?.detalladas?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {reporte.comandas?.detalladas?.length > 0 ? (
                      <div className="space-y-3">
                        {reporte.comandas.detalladas.map(comanda => (
                          <Collapsible key={comanda.id} open={comandasAbiertas[comanda.id]}>
                            <CollapsibleTrigger 
                              onClick={() => toggleComanda(comanda.id)}
                              className="w-full"
                            >
                              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                  {comandasAbiertas[comanda.id] ? (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                  )}
                                  <div className="text-left">
                                    <span className="font-bold text-amber-700">{comanda.numero_comanda}</span>
                                    <span className="text-gray-500 ml-2">Mesa {comanda.mesa}</span>
                                    <span className="text-gray-400 ml-2 text-sm">• {comanda.mesero}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-green-600">${comanda.total?.toFixed(2)}</span>
                                  <Badge className="ml-2 bg-amber-100 text-amber-700">{comanda.cantidad_platos} platos</Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-8 mt-2 p-4 bg-white border rounded-lg space-y-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-3">
                                  <span>🕐 Apertura: {comanda.hora_apertura}</span>
                                  <span>🕐 Cierre: {comanda.hora_cierre}</span>
                                </div>
                                {comanda.platos.map((plato, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-amber-600">🍽️</span>
                                      <span className="font-medium">{plato.nombre}</span>
                                      <Badge variant="outline">x{plato.cantidad}</Badge>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-500 text-sm">${plato.precio_unitario?.toFixed(2)} c/u</span>
                                      <span className="ml-3 font-semibold text-green-600">${plato.subtotal?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No hay comandas pagadas este día</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Gastos */}
              <TabsContent value="gastos" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gastos por Categoría */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Gastos por Categoría
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {Object.keys(reporte.gastos.por_categoria).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(reporte.gastos.por_categoria).map(([categoria, data]) => (
                            <div key={categoria} className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">{categoria}</span>
                                  <Badge className="bg-red-200 text-red-800">{data.cantidad}</Badge>
                                </div>
                                <div className="text-right">
                                  {data.total_usd > 0 && <p className="text-xl font-bold text-red-600">${data.total_usd.toFixed(2)}</p>}
                                  {data.total_bs > 0 && <p className="text-xl font-bold text-red-600">Bs {data.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">No hay gastos registrados</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Detalle de Gastos */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Detalle de Gastos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 max-h-96 overflow-y-auto">
                      {reporte.gastos.detalle.length > 0 ? (
                        <div className="space-y-3">
                          {reporte.gastos.detalle.map(gasto => (
                            <div key={gasto.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{gasto.descripcion}</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline">{gasto.categoria}</Badge>
                                    <Badge className="bg-blue-100 text-blue-700">
                                      {metodosConfig[gasto.metodo_pago]?.label || gasto.metodo_pago}
                                    </Badge>
                                  </div>
                                </div>
                                <span className="font-bold text-red-600">
                                  {metodosBolivares(gasto.metodo_pago)
                                    ? `Bs ${(gasto.monto_original || gasto.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                    : `$${(gasto.monto || 0).toFixed(2)}`
                                  }
                                </span>
                              </div>
                              {gasto.comprobante && (
                                <p className="text-xs text-gray-500 mt-2">📄 {gasto.comprobante}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">No hay gastos registrados</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab Detalle Ventas */}
              <TabsContent value="detalle" className="space-y-4">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Detalle de Ventas ({reporte.ventas.detalle.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {reporte.ventas.detalle.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-3">Hora</th>
                              <th className="text-left p-3">Método de Pago</th>
                              <th className="text-right p-3">USD</th>
                              <th className="text-right p-3">COP</th>
                              <th className="text-right p-3">VES</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reporte.ventas.detalle.map(venta => (
                              <tr key={venta.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{venta.hora}</td>
                                <td className="p-3">
                                  <Badge className="bg-green-100 text-green-700">
                                    {metodosConfig[venta.metodo_pago]?.label || venta.metodo_pago}
                                  </Badge>
                                </td>
                                <td className="p-3 text-right font-medium">${venta.total?.toFixed(2)}</td>
                                <td className="p-3 text-right text-gray-500">
                                  {venta.total_cop ? `$${venta.total_cop.toLocaleString()}` : '-'}
                                </td>
                                <td className="p-3 text-right text-gray-500">
                                  {venta.total_ves ? `Bs ${venta.total_ves.toLocaleString()}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-green-50 font-bold">
                              <td colSpan={2} className="p-3">TOTAL</td>
                              <td className="p-3 text-right text-green-700">${reporte.ventas.total_divisas.toFixed(2)}</td>
                              <td className="p-3 text-right"></td>
                              <td className="p-3 text-right"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No hay ventas registradas</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Exportar */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-lg">📤 Exportar Reporte</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4">
                  <Button onClick={exportarCSV} variant="outline" className="flex-1 sm:flex-none">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>

                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Reporte generado el {format(parseISO(reporte.generado_en), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {!reporte && !isLoading && (
          <Card className="shadow-lg border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600">Selecciona una fecha y genera el reporte</p>
              <p className="text-sm text-gray-500 mt-2">Podrás ver el resumen completo de ventas y gastos del día</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}