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

  const gastosFiltrados = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaGasto >= inicio && fechaGasto <= fin && g.afecta_caja !== false;
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
        movimientos[venta.metodo_pago].entradas += venta.total_venta;
        movimientos[venta.metodo_pago].cantidad_entradas += 1;
      }
    });

    // ENTRADAS: Pagos mixtos
    const ventasIds = ventasFiltradas.map(v => v.id);
    pagosMixtos.forEach(pago => {
      if (ventasIds.includes(pago.venta_id) && movimientos[pago.metodo_pago]) {
        movimientos[pago.metodo_pago].entradas += pago.monto_usd;
        movimientos[pago.metodo_pago].cantidad_entradas += 1;
      }
    });

    // SALIDAS: Gastos
    gastosFiltrados.forEach(gasto => {
      if (movimientos[gasto.metodo_pago]) {
        movimientos[gasto.metodo_pago].salidas += gasto.monto;
        movimientos[gasto.metodo_pago].cantidad_salidas += 1;
      }
    });

    return movimientos;
  };

  const movimientos = calcularMovimientos();

  // Calcular totales generales
  let totalEntradasGeneral = 0;
  let totalSalidasGeneral = 0;
  const reportes = Object.entries(metodosConfig).map(([key, config]) => {
    const mov = movimientos[key];
    const saldo = mov.entradas - mov.salidas;
    totalEntradasGeneral += mov.entradas;
    totalSalidasGeneral += mov.salidas;
    
    return {
      metodo: key,
      ...config,
      ...mov,
      saldo,
      cantidad_movimientos: mov.cantidad_entradas + mov.cantidad_salidas
    };
  }).filter(r => r.cantidad_movimientos > 0);

  const saldoNetoGeneral = totalEntradasGeneral - totalSalidasGeneral;

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

  const isLoading = loadingVentas || loadingPagos || loadingGastos;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg border-none">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Cargando reportes...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <span className="leading-tight">Reportes de Entrada/Salida</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Flujo de caja por método de pago
          </p>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
              <Button onClick={exportarExcel} variant="outline" className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen General */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-lg border-none bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💰 Total Entradas</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    ${totalEntradasGeneral.toFixed(2)}
                  </h3>
                </div>
                <ArrowUpCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💸 Total Salidas</p>
                  <h3 className="text-2xl font-bold text-red-600">
                    ${totalSalidasGeneral.toFixed(2)}
                  </h3>
                </div>
                <ArrowDownCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">✅ Saldo Neto</p>
                  <h3 className={`text-2xl font-bold ${saldoNetoGeneral >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    ${saldoNetoGeneral.toFixed(2)}
                  </h3>
                </div>
                <DollarSign className={`w-8 h-8 ${saldoNetoGeneral >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reportes por Método */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>📊 Reportes Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {reportes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportes.map(reporte => {
                  const saldoPositivo = reporte.saldo >= 0;
                  return (
                    <Card 
                      key={reporte.metodo} 
                      className={`shadow-md border-2 ${saldoPositivo ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-bold text-gray-900">{reporte.label}</h3>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">💰 Entradas:</span>
                            <span className="font-semibold text-green-600">
                              ${reporte.entradas.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">💸 Salidas:</span>
                            <span className="font-semibold text-red-600">
                              ${reporte.salidas.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-gray-700 font-medium">✅ Saldo:</span>
                            <span className={`font-bold text-lg ${saldoPositivo ? 'text-green-700' : 'text-red-700'}`}>
                              ${reporte.saldo.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>📊 Movimientos:</span>
                            <span>{reporte.cantidad_movimientos}</span>
                          </div>
                        </div>

                        <Link to={createPageUrl(`ReporteEntradaSalidaDetalle?metodo=${reporte.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                          <Button className="w-full mt-2" size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Reporte Completo
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay movimientos en este período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}