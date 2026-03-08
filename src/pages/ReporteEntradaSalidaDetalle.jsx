import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function ReporteEntradaSalidaDetalle() {
  const [metodo, setMetodo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setMetodo(urlParams.get('metodo') || "");
    setFechaInicio(urlParams.get('inicio') || format(new Date(), 'yyyy-MM-dd'));
    setFechaFin(urlParams.get('fin') || format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const data = await base44.entities.Venta.list('-created_date', 500);
      console.log(`✅ Ventas para ${metodo}:`, data.filter(v => v.metodo_pago === metodo).length);
      return data;
    },
    enabled: !!metodo,
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
    enabled: !!metodo,
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 500),
    enabled: !!metodo,
  });

  if (!metodo || !metodosConfig[metodo]) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Método de pago no válido</p>
        <Link to={createPageUrl("ReportesEntradaSalida")}>
          <Button className="mt-4">Volver a Reportes</Button>
        </Link>
      </div>
    );
  }

  const metodoDef = metodosConfig[metodo];
  
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

  // Construir movimientos
  const movimientos = [];

  // ENTRADAS: Ventas simples
  ventasFiltradas.forEach(venta => {
    if (venta.metodo_pago === metodo) {
      movimientos.push({
        id: venta.id,
        fecha: venta.fecha_hora,
        tipo: 'entrada',
        subtipo: 'venta_simple',
        concepto: 'Venta completa',
        monto_usd: venta.total_venta,
        referencia: venta.id.substring(0, 8)
      });
    }
  });

  // ENTRADAS: Pagos mixtos
  const ventasIds = ventasFiltradas.map(v => v.id);
  pagosMixtos.forEach(pago => {
    if (ventasIds.includes(pago.venta_id) && pago.metodo_pago === metodo) {
      movimientos.push({
        id: pago.id,
        fecha: ventasFiltradas.find(v => v.id === pago.venta_id)?.fecha_hora,
        tipo: 'entrada',
        subtipo: 'pago_mixto',
        concepto: 'Pago mixto (parte de venta)',
        monto_usd: pago.monto_usd,
        referencia: pago.venta_id.substring(0, 8)
      });
    }
  });

  // SALIDAS: Gastos
  gastosFiltrados.forEach(gasto => {
    if (gasto.metodo_pago === metodo) {
      movimientos.push({
        id: gasto.id,
        fecha: gasto.fecha_gasto,
        tipo: 'salida',
        subtipo: 'gasto',
        concepto: gasto.descripcion,
        monto_usd: gasto.monto,
        referencia: gasto.comprobante || gasto.id.substring(0, 8),
        categoria: gasto.categoria
      });
    }
  });

  // Ordenar por fecha descendente
  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.monto_usd, 0);
  const totalSalidas = movimientos.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.monto_usd, 0);
  const saldoFinal = totalEntradas - totalSalidas;
  const cantidadEntradas = movimientos.filter(m => m.tipo === 'entrada').length;
  const cantidadSalidas = movimientos.filter(m => m.tipo === 'salida').length;

  const exportarExcel = () => {
    const rows = [
      [`REPORTE ENTRADA/SALIDA - ${metodoDef.label}`],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN FINANCIERO"],
      [`Total Entradas: $${totalEntradas.toFixed(2)}`],
      [`Total Salidas: $${totalSalidas.toFixed(2)}`],
      [`Saldo Final: $${saldoFinal.toFixed(2)}`],
      [`Entradas: ${cantidadEntradas} transacciones`],
      [`Salidas: ${cantidadSalidas} transacciones`],
      [],
      ["Fecha y Hora", "Tipo", "Concepto", "Monto", "Referencia"],
    ];

    movimientos.forEach(m => {
      rows.push([
        format(parseISO(m.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        m.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA',
        m.concepto,
        `$${m.monto_usd.toFixed(2)}`,
        m.referencia
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_entrada_salida_${metodo}_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado exitosamente");
  };

  const isLoading = loadingVentas || loadingPagos || loadingGastos;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("ReportesEntradaSalida")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {metodoDef.label}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(fechaInicio), "dd MMM yyyy", { locale: es })} - {format(new Date(fechaFin), "dd MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <Button onClick={exportarExcel} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="shadow-lg border-none bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💰 Entradas</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    ${totalEntradas.toFixed(2)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{cantidadEntradas} transacciones</p>
                </div>
                <ArrowUpCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💸 Salidas</p>
                  <h3 className="text-2xl font-bold text-red-600">
                    ${totalSalidas.toFixed(2)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{cantidadSalidas} transacciones</p>
                </div>
                <ArrowDownCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-lg border-none bg-gradient-to-br ${saldoFinal >= 0 ? 'from-purple-50 to-indigo-50' : 'from-red-50 to-rose-50'}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">✅ Saldo Final</p>
                  <h3 className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    ${saldoFinal.toFixed(2)}
                  </h3>
                </div>
                {saldoFinal >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">📊 Movimientos</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {movimientos.length}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Movimientos */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-lg">📋 Detalle de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : movimientos.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((m, index) => (
                      <TableRow key={`${m.id}-${index}`} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {format(parseISO(m.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.tipo === 'entrada' ? 'default' : 'destructive'} className="flex items-center gap-1 w-fit">
                            {m.tipo === 'entrada' ? (
                              <>
                                <ArrowUpCircle className="w-3 h-3" />
                                ENTRADA
                              </>
                            ) : (
                              <>
                                <ArrowDownCircle className="w-3 h-3" />
                                SALIDA
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {m.concepto}
                          {m.categoria && (
                            <Badge variant="outline" className="ml-2 text-xs">{m.categoria}</Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.tipo === 'entrada' ? '+' : '-'}${m.monto_usd.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {m.referencia}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-purple-50 font-bold border-t-2">
                      <TableCell colSpan={3}>SALDO FINAL</TableCell>
                      <TableCell className={`text-right text-lg ${saldoFinal >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                        ${saldoFinal.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay movimientos en este período para {metodoDef.label}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
