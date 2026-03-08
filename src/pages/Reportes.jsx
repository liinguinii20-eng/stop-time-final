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

  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + (v.total_venta || 0), 0);

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

  const gastosFiltrados = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaGasto >= inicio && fechaGasto <= fin;
    } catch (error) {
      console.error('Error filtrando gasto:', g, error);
      return false;
    }
  });

  // Separar flujos por moneda
  const metodosBolivares = (metodo) => metodo && metodo.endsWith('_bs');
  const metodosDivisas = (metodo) => metodo && !metodo.endsWith('_bs') && !['cuentas_por_cobrar', 'mixto'].includes(metodo);

  // Cálculos separados por caja - SIN CONVERSIÓN
  const totalVentasDivisas = ventasFiltradas.filter(v => metodosDivisas(v.metodo_pago)).reduce((sum, v) => sum + (v.total_venta || 0), 0);
  const totalVentasBolivares = ventasFiltradas.filter(v => metodosBolivares(v.metodo_pago)).reduce((sum, v) => sum + (v.total_ves || 0), 0);
  
  const totalGastosDivisas = gastosFiltrados.filter(g => metodosDivisas(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const totalGastosBolivares = gastosFiltrados.filter(g => metodosBolivares(g.metodo_pago)).reduce((sum, g) => sum + (g.monto_original || g.monto || 0), 0);

  const netoDivisas = totalVentasDivisas - totalGastosDivisas;
  const netoBolivares = totalVentasBolivares - totalGastosBolivares;

  const exportarReporte = () => {
    const csvContent = [
      ["Reporte de Rentabilidad - Stop Time"],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN FINANCIERO"],
      ["Total Ventas", `$${totalVentas.toFixed(2)}`],
      ["Total Gastos", `$${totalGastos.toFixed(2)}`],
      ["Ganancia Neta", `$${gananciaNeta.toFixed(2)}`],
      [],
      ["DETALLE DE VENTAS"],
      ["Fecha", "Método Pago", "Monto"],
      ...ventasFiltradas.map(v => [
        format(parseISO(v.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es }),
        v.metodo_pago,
        `$${v.total_venta.toFixed(2)}`
      ]),
      [],
      ["DETALLE DE GASTOS"],
      ["Fecha", "Descripción", "Categoría", "Monto"],
      ...gastosFiltrados.map(g => [
        format(parseISO(g.fecha_gasto), "dd/MM/yyyy HH:mm", { locale: es }),
        g.descripcion,
        g.categoria,
        `$${g.monto.toFixed(2)}`
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
  if (errorVentas || errorDetalles || errorGastos) {
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
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
              <span className="leading-tight">Reporte de Rentabilidad</span>
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">Análisis simple: Ventas vs Gastos</p>
          </div>
          <Button onClick={exportarReporte} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>

        {/* SECCIÓN: Ventas de HOY - DETALLADAS */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-xl flex items-center gap-2 text-green-800">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="leading-tight">Ventas de Hoy - {format(new Date(), "dd 'de' MMMM", { locale: es })}</span>
              </CardTitle>
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-green-700 font-medium">{ventasHoy.length} ventas</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">${totalVentasHoy.toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingVentas || loadingDetalles ? (
              <Skeleton className="h-48 w-full" />
            ) : ventasHoy.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {ventasHoy.map((venta) => (
                  <VentaDetallada 
                    key={venta.id} 
                    venta={venta} 
                    detalles={detallesVentas}
                  />
                ))}
                <div className="bg-green-100 p-3 sm:p-4 flex justify-between items-center">
                  <span className="font-bold text-green-900 text-sm sm:text-lg">TOTAL DEL DÍA</span>
                  <span className="text-xl sm:text-2xl font-bold text-green-700">${totalVentasHoy.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay ventas registradas hoy</p>
                <p className="text-sm text-gray-400 mt-1">Las ventas procesadas aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtros de Fecha */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Análisis por Período Personalizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <p className="text-sm text-gray-500 mt-3">
              💡 Selecciona un rango de fechas para ver el análisis de rentabilidad del período
            </p>
          </CardContent>
        </Card>

        {/* Resumen Principal - CORREGIDO */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-xl lg:text-2xl leading-tight">
              Resumen del Período: {format(new Date(fechaInicio), "dd/MM/yy", { locale: es })} - {format(new Date(fechaFin), "dd/MM/yy", { locale: es })}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {ventasFiltradas.length} ventas • {gastosFiltrados.length} gastos
            </p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Resumen por moneda */}
            <div className="bg-amber-100 p-4 rounded-xl">
              <p className="text-sm font-semibold text-amber-900 mb-2">💰 Resumen General</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Ventas USD</p>
                  <p className="font-bold text-green-700">${totalVentasDivisas.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Ventas Bs</p>
                  <p className="font-bold text-green-700">Bs {totalVentasBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-gray-600">Gastos USD</p>
                  <p className="font-bold text-red-700">${totalGastosDivisas.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Gastos Bs</p>
                  <p className="font-bold text-red-700">Bs {totalGastosBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            {/* Caja USD */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 opacity-30 rounded-xl"></div>
              <div className="relative flex items-center p-4 sm:p-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border-2 border-blue-300">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="p-2.5 sm:p-4 rounded-full bg-white shadow-lg flex-shrink-0">
                    <DollarSign className="w-7 h-7 sm:w-10 sm:h-10 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-blue-900 font-bold uppercase">💵 TOTAL CAJA USD</p>
                    <p className={`text-2xl sm:text-3xl lg:text-4xl font-black truncate ${netoDivisas >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      ${netoDivisas.toFixed(2)}
                    </p>
                    <div className="text-xs text-blue-700 mt-1 space-y-0.5">
                      <p>📥 Ventas: ${totalVentasDivisas.toFixed(2)} | 📤 Gastos: ${totalGastosDivisas.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Caja Bolívares */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-emerald-200 opacity-30 rounded-xl"></div>
              <div className="relative flex items-center p-4 sm:p-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-2 border-green-300">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="p-2.5 sm:p-4 rounded-full bg-white shadow-lg flex-shrink-0">
                    <TrendingUp className="w-7 h-7 sm:w-10 sm:h-10 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-green-900 font-bold uppercase">💳 TOTAL BANCO BS</p>
                    <p className={`text-2xl sm:text-3xl lg:text-4xl font-black truncate ${netoBolivares >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Bs {netoBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="text-xs text-green-700 mt-1 space-y-0.5">
                      <p>📥 Ventas: Bs {totalVentasBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })} | 📤 Gastos: Bs {totalGastosBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Ventas y Gastos - CORREGIDO */}
        <Tabs defaultValue="ventas" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ventas" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ventas del Período</span>
              <span className="sm:hidden">Ventas</span>
              <span className="text-xs">({ventasFiltradas.length})</span>
            </TabsTrigger>
            <TabsTrigger value="gastos" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Gastos del Período</span>
              <span className="sm:hidden">Gastos</span>
              <span className="text-xs">({gastosFiltrados.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Detalle de Ventas - CORREGIDO */}
          <TabsContent value="ventas">
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  Detalle de Ventas del Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVentas ? (
                  <Skeleton className="h-64 w-full" />
                ) : ventasFiltradas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Fecha y Hora</TableHead>
                          <TableHead>Método de Pago</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventasFiltradas.map((venta) => (
                          <TableRow key={venta.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm">
                              {format(parseISO(venta.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{venta.metodo_pago}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {metodosBolivares(venta.metodo_pago) 
                                ? `Bs ${(venta.total_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                : `$${venta.total_venta.toFixed(2)}`
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-blue-50 font-bold">
                          <TableCell colSpan={2}>TOTAL USD</TableCell>
                          <TableCell className="text-right text-blue-700 text-lg">
                            ${totalVentasDivisas.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50 font-bold">
                          <TableCell colSpan={2}>TOTAL BS</TableCell>
                          <TableCell className="text-right text-green-700 text-lg">
                            Bs {totalVentasBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p>No hay ventas en este período</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Periodo: {format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - {format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detalle de Gastos - CORREGIDO */}
          <TabsContent value="gastos">
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Detalle de Gastos del Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingGastos ? (
                  <Skeleton className="h-64 w-full" />
                ) : gastosFiltrados.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Fecha y Hora</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gastosFiltrados.map((gasto) => (
                          <TableRow key={gasto.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm">
                              {format(parseISO(gasto.fecha_gasto), "dd/MM/yyyy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell className="font-medium">{gasto.descripcion}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{gasto.categoria}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {metodosBolivares(gasto.metodo_pago)
                                ? `Bs ${(gasto.monto_original || gasto.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                : `$${gasto.monto.toFixed(2)}`
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-blue-50 font-bold">
                          <TableCell colSpan={3}>TOTAL USD</TableCell>
                          <TableCell className="text-right text-blue-700 text-lg">
                            ${totalGastosDivisas.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50 font-bold">
                          <TableCell colSpan={3}>TOTAL BS</TableCell>
                          <TableCell className="text-right text-green-700 text-lg">
                            Bs {totalGastosBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p>No hay gastos en este período</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Periodo: {format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - {format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
