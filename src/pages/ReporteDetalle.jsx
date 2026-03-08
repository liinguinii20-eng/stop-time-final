import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const metodosConfig = {
  efectivo_usd: { label: "💵 Efectivo USD", moneda: "usd", simbolo: "$", grupo: "dólares" },
  binance_usd: { label: "📱 Binance", moneda: "usd", simbolo: "$", grupo: "dólares" },
  zinli_usd: { label: "📱 Zinli", moneda: "usd", simbolo: "$", grupo: "dólares" },
  paypal_usd: { label: "🌐 PayPal", moneda: "usd", simbolo: "$", grupo: "dólares" },
  zelle_usd: { label: "🏦 Zelle", moneda: "usd", simbolo: "$", grupo: "dólares" },
  efectivo_cop: { label: "💵 Efectivo COP", moneda: "cop", simbolo: "₡", grupo: "pesos" },
  nequi_cop: { label: "📱 Nequi", moneda: "cop", simbolo: "₡", grupo: "pesos" },
  tarjeta_bs: { label: "💳 Tarjeta Bs", moneda: "ves", simbolo: "Bs", grupo: "bolívares" },
  pago_movil_bs: { label: "📱 Pago Móvil", moneda: "ves", simbolo: "Bs", grupo: "bolívares" }
};

export default function ReporteDetalle() {
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
      console.log('✅ Ventas cargadas para reporte:', data.length);
      return data;
    },
    enabled: !!metodo,
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: async () => {
      const data = await base44.entities.PagoMixto.list('-created_date', 1000);
      console.log('✅ Pagos mixtos cargados para reporte:', data.length);
      return data;
    },
    enabled: !!metodo,
  });

  if (!metodo || !metodosConfig[metodo]) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Método de pago no válido</p>
        <Link to={createPageUrl("ReportesMetodosPago")}>
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

  // Obtener transacciones del método
  const transacciones = [];

  // Ventas simples
  ventasFiltradas.forEach(venta => {
    if (venta.metodo_pago === metodo) {
      const montoOriginal = metodoDef.moneda === 'usd' ? venta.total_venta :
                           metodoDef.moneda === 'cop' ? (venta.total_cop || venta.total_venta * 4000) :
                           (venta.total_ves || 0);
      
      console.log(`➕ Venta simple ${metodo}:`, venta.id, '$' + venta.total_venta);
      
      transacciones.push({
        id: venta.id,
        fecha: venta.fecha_hora,
        tipo: 'venta_simple',
        monto_usd: venta.total_venta,
        monto_original: montoOriginal,
        tasa: metodoDef.moneda === 'ves' ? (venta.tasa_bs_aplicada || 0) : (metodoDef.moneda === 'cop' ? 4000 : 1)
      });
    }
  });

  // Pagos mixtos
  const ventasIds = ventasFiltradas.map(v => v.id);
  pagosMixtos.forEach(pago => {
    if (ventasIds.includes(pago.venta_id) && pago.metodo_pago === metodo) {
      console.log(`➕ Pago mixto ${metodo}:`, pago.id, '$' + pago.monto_usd);
      
      transacciones.push({
        id: pago.id,
        fecha: ventasFiltradas.find(v => v.id === pago.venta_id)?.fecha_hora,
        tipo: 'pago_mixto',
        monto_usd: pago.monto_usd,
        monto_original: pago.monto_original,
        tasa: pago.tasa_cambio_aplicada || 1,
        venta_id: pago.venta_id
      });
    }
  });

  console.log(`📊 Total transacciones para ${metodo}:`, transacciones.length);

  // Ordenar por fecha descendente
  transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const totalUSD = transacciones.reduce((sum, t) => sum + t.monto_usd, 0);
  const totalOriginal = transacciones.reduce((sum, t) => sum + t.monto_original, 0);
  const promedio = transacciones.length > 0 ? totalUSD / transacciones.length : 0;

  const exportarExcel = () => {
    const rows = [
      [`REPORTE DETALLADO - ${metodoDef.label}`],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN"],
      [`Total USD: $${totalUSD.toFixed(2)}`],
      [`Total ${metodoDef.simbolo}: ${totalOriginal.toFixed(2)}`],
      [`Cantidad de Transacciones: ${transacciones.length}`],
      [`Promedio por Transacción: $${promedio.toFixed(2)}`],
      [],
      ["Fecha y Hora", "Tipo", "Monto USD", `Monto ${metodoDef.simbolo}`, "Tasa"],
    ];

    transacciones.forEach(t => {
      rows.push([
        format(parseISO(t.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        t.tipo === 'venta_simple' ? 'Venta Completa' : 'Pago Mixto',
        `$${t.monto_usd.toFixed(2)}`,
        `${metodoDef.simbolo} ${t.monto_original.toFixed(2)}`,
        t.tasa.toFixed(2)
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${metodo}_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado exitosamente");
  };

  const isLoading = loadingVentas || loadingPagos;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("ReportesMetodosPago")}>
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
          <Button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total USD</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    ${totalUSD.toFixed(2)}
                  </h3>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total {metodoDef.simbolo}</p>
                  <h3 className="text-2xl font-bold text-blue-600">
                    {totalOriginal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Transacciones</p>
                  <h3 className="text-2xl font-bold text-purple-600">
                    {transacciones.length}
                  </h3>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Promedio</p>
                  <h3 className="text-2xl font-bold text-amber-600">
                    ${promedio.toFixed(2)}
                  </h3>
                </div>
                <DollarSign className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Transacciones */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-lg">Detalle de Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : transacciones.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto USD</TableHead>
                      <TableHead className="text-right">Monto {metodoDef.simbolo}</TableHead>
                      <TableHead className="text-right">Tasa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacciones.map((t, index) => (
                      <TableRow key={`${t.id}-${index}`} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {format(parseISO(t.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.tipo === 'venta_simple' ? 'default' : 'secondary'}>
                            {t.tipo === 'venta_simple' ? '💰 Venta Completa' : '🔄 Pago Mixto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${t.monto_usd.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {metodoDef.simbolo} {t.monto_original.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-gray-600 text-sm">
                          {t.tasa.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-amber-50 font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right text-green-700 text-lg">
                        ${totalUSD.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-blue-700 text-lg">
                        {metodoDef.simbolo} {totalOriginal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay transacciones en este período para {metodoDef.label}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
