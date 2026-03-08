import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, FileSpreadsheet, Receipt } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EstadoCuentaDetalle() {
  const urlParams = new URLSearchParams(window.location.search);
  const metodo = urlParams.get('metodo');
  const fechaInicio = urlParams.get('inicio');
  const fechaFin = urlParams.get('fin');

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Venta.list('-created_date', 500),
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 500),
  });

  const { data: comandas = [], isLoading: loadingComandas } = useQuery({
    queryKey: ['comandas'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 500),
  });

  const { data: tasasCambio = [], isLoading: loadingTasas } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 100),
  });

  const { data: pagosCuentasPorCobrar = [], isLoading: loadingPagosCxC } = useQuery({
    queryKey: ['pagos-cuentas-por-cobrar'],
    queryFn: () => base44.entities.PagoCuentaPorCobrar.list('-created_date', 1000),
  });

  const { data: cuentasPorCobrar = [], isLoading: loadingCxC } = useQuery({
    queryKey: ['cuentas-por-cobrar'],
    queryFn: () => base44.entities.CuentaPorCobrar.list('-created_date', 500),
  });

  const metodosConfig = {
    efectivo_usd: { label: "💵 Efectivo USD", icono: "💵" },
    binance_usd: { label: "📱 Binance", icono: "📱" },
    zinli_usd: { label: "📱 Zinli", icono: "📱" },
    paypal_usd: { label: "🌐 PayPal", icono: "🌐" },
    zelle_usd: { label: "🏦 Zelle", icono: "🏦" },
    nequi_cop: { label: "📱 Nequi", icono: "📱" },
    tarjeta_bs: { label: "💳 Tarjeta Bs", icono: "💳" },
    pago_movil_bs: { label: "📱 Pago Móvil", icono: "📱" },
    cuentas_por_cobrar: { label: "📋 Cuentas por Cobrar", icono: "📋" }
  };

  if (!metodo || !metodosConfig[metodo]) {
    return (
      <div className="p-8">
        <Card className="shadow-lg">
          <CardContent className="p-12 text-center">
            <p className="text-red-600">Método de pago inválido</p>
            <Link to={createPageUrl('EstadosCuenta')}>
              <Button className="mt-4">Volver</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ventasFiltradas = ventas.filter(v => {
    try {
      const fechaVenta = parseISO(v.fecha_hora);
      const inicio = startOfDay(parseISO(fechaInicio + 'T00:00:00'));
      const fin = endOfDay(parseISO(fechaFin + 'T23:59:59'));
      return fechaVenta >= inicio && fechaVenta <= fin;
    } catch {
      return false;
    }
  });

  const gastosFiltrados = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto);
      const inicio = startOfDay(parseISO(fechaInicio + 'T00:00:00'));
      const fin = endOfDay(parseISO(fechaFin + 'T23:59:59'));
      return fechaGasto >= inicio && fechaGasto <= fin && g.afecta_caja !== false;
    } catch {
      return false;
    }
  });

  // Construir movimientos
  const movimientos = [];

  // Agregar entradas de ventas simples (excepto cuentas por cobrar)
  ventasFiltradas.forEach(venta => {
    if (venta.metodo_pago === metodo && metodo !== 'cuentas_por_cobrar') {
      // USAR EL MONTO DE LA VENTA (ya incluye descuentos)
      let monto = venta.total_venta;
      let concepto = `Venta ${venta.id.substring(0, 8)}`;

      // Buscar comanda asociada por fecha cercana (permite descuentos)
      const comandaAsociada = comandas.find(c => {
        const fechaCercana = Math.abs(new Date(c.fecha_cierre || c.fecha_apertura) - new Date(venta.fecha_hora)) < 60000; // 1 minuto
        // Permitir hasta 30% de diferencia por descuentos
        const montoCercano = c.total_comanda >= venta.total_venta && c.total_comanda - venta.total_venta <= c.total_comanda * 0.30;
        return fechaCercana && (montoCercano || Math.abs(c.total_comanda - venta.total_venta) < 0.01);
      });

      // Para métodos VES, usar el monto en bolívares de la VENTA
      if (metodo === 'tarjeta_bs' || metodo === 'pago_movil_bs') {
        if (venta.total_ves > 0) {
          monto = venta.total_ves;
        } else {
          monto = venta.total_venta * (venta.tasa_bs_aplicada || 50);
        }
        if (comandaAsociada) {
          concepto = `${comandaAsociada.numero_comanda} - Mesa ${comandaAsociada.mesa_numero}`;
        }
      } else if (metodo === 'efectivo_cop' || metodo === 'nequi_cop') {
        // Usar total_cop de la VENTA (ya ajustado por descuentos)
        const valorCOP = venta.total_cop || 0;
        const valorUSD = venta.total_venta || 0;

        if (valorCOP > 0) {
          monto = valorCOP;
        } else if (valorUSD > 1000) {
          monto = valorUSD;
        } else {
          monto = valorUSD * 4000;
        }
        if (comandaAsociada) {
          concepto = `${comandaAsociada.numero_comanda} - Mesa ${comandaAsociada.mesa_numero}`;
        }
      } else {
        // USD: usar total_venta (ya incluye descuento)
        monto = venta.total_venta;
        if (comandaAsociada) {
          concepto = `${comandaAsociada.numero_comanda} - Mesa ${comandaAsociada.mesa_numero}`;
        }
      }

      movimientos.push({
        fecha: venta.fecha_hora,
        tipo: 'ENTRADA',
        concepto: concepto,
        monto: monto,
        referencia: venta.id
      });
    }
  });

  // Agregar entradas de pagos mixtos (excluir cuentas por cobrar del detalle)
  const ventasIds = ventasFiltradas.map(v => v.id);
  pagosMixtos.forEach(pago => {
    if (ventasIds.includes(pago.venta_id) && pago.metodo_pago === metodo && metodo !== 'cuentas_por_cobrar') {
      let monto = pago.monto_usd;
      let concepto = `Venta Mixta ${pago.venta_id.substring(0, 8)}`;

      const ventaOriginal = ventasFiltradas.find(v => v.id === pago.venta_id);
      // Buscar comanda con tolerancia para descuentos
      const comandaAsociada = comandas.find(c => {
        if (!ventaOriginal) return false;
        const fechaCercana = Math.abs(new Date(c.fecha_cierre || c.fecha_apertura) - new Date(ventaOriginal.fecha_hora)) < 60000;
        const montoCercano = c.total_comanda >= ventaOriginal.total_venta && c.total_comanda - ventaOriginal.total_venta <= c.total_comanda * 0.30;
        return fechaCercana && (montoCercano || Math.abs(c.total_comanda - ventaOriginal.total_venta) < 0.01);
      });

      // Para métodos VES, usar monto original en bolívares
      if (metodo === 'tarjeta_bs' || metodo === 'pago_movil_bs') {
        monto = pago.monto_original || (pago.monto_usd * 50);
        if (comandaAsociada) {
          concepto = `${comandaAsociada.numero_comanda} - Mesa ${comandaAsociada.mesa_numero} (Mixto)`;
        }
      } else if (metodo === 'efectivo_cop' || metodo === 'nequi_cop') {
        monto = pago.monto_original || (pago.monto_usd * 4000);
        if (comandaAsociada) {
          concepto = `${comandaAsociada.numero_comanda} - Mesa ${comandaAsociada.mesa_numero} (Mixto)`;
        }
      } else {
        if (comandaAsociada) {
          concepto = `${comandaAsociada.numero_comanda} - Mesa ${comandaAsociada.mesa_numero} (Mixto)`;
        }
      }

      movimientos.push({
        fecha: ventaOriginal?.fecha_hora,
        tipo: 'ENTRADA',
        concepto: concepto,
        monto: monto,
        referencia: pago.id
      });
    }
  });

  // Agregar entradas de pagos de Cuentas por Cobrar
  const pagosCxCFiltrados = pagosCuentasPorCobrar.filter(p => {
    try {
      const fechaPago = parseISO(p.fecha_pago);
      const inicio = startOfDay(parseISO(fechaInicio + 'T00:00:00'));
      const fin = endOfDay(parseISO(fechaFin + 'T23:59:59'));
      return fechaPago >= inicio && fechaPago <= fin && p.metodo_pago === metodo;
    } catch {
      return false;
    }
  });

  pagosCxCFiltrados.forEach(pago => {
    let monto = pago.monto_pagado;
    const cuenta = cuentasPorCobrar.find(c => c.id === pago.cuenta_id);
    let concepto = `Pago CxC - ${cuenta?.cliente_nombre || 'Cliente'}`;

    if (metodo === 'tarjeta_bs' || metodo === 'pago_movil_bs') {
      monto = pago.monto_pagado * (pago.tasa_bs_aplicada || 50);
    } else if (metodo === 'nequi_cop') {
      monto = pago.monto_pagado * 4000;
    }

    movimientos.push({
      fecha: pago.fecha_pago,
      tipo: 'ENTRADA',
      concepto: concepto,
      monto: monto,
      referencia: pago.id
    });
  });

  // Función para obtener la tasa del día
  const obtenerTasaDelDia = (fecha) => {
    try {
      const fechaStr = format(parseISO(fecha), 'yyyy-MM-dd');
      const tasaDelDia = tasasCambio.find(t => t.fecha === fechaStr);
      return tasaDelDia?.tasa_bs_usd || 50; // fallback a 50 si no hay tasa
    } catch {
      return 50;
    }
  };

  // Agregar salidas de gastos
  gastosFiltrados.forEach(gasto => {
    if (gasto.metodo_pago === metodo) {
      let monto = gasto.monto;

      // Para métodos VES, convertir usando la tasa del día del gasto
      if (metodo === 'tarjeta_bs' || metodo === 'pago_movil_bs') {
        const tasaDelDia = obtenerTasaDelDia(gasto.fecha_gasto);
        monto = gasto.monto * tasaDelDia;
      } else if (metodo === 'nequi_cop') {
        monto = gasto.monto * 4000;
      }

      movimientos.push({
        fecha: gasto.fecha_gasto,
        tipo: 'SALIDA',
        concepto: gasto.descripcion,
        monto: monto,
        referencia: gasto.id
      });
    }
  });

  // Ordenar por fecha
  movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Calcular saldo acumulado
  let saldoAcumulado = 0;
  movimientos.forEach(mov => {
    if (mov.tipo === 'ENTRADA') {
      saldoAcumulado += mov.monto;
    } else {
      saldoAcumulado -= mov.monto;
    }
    mov.saldo = saldoAcumulado;
  });

  const totalEntradas = movimientos
    .filter(m => m.tipo === 'ENTRADA')
    .reduce((sum, m) => sum + m.monto, 0);

  const totalSalidas = movimientos
    .filter(m => m.tipo === 'SALIDA')
    .reduce((sum, m) => sum + m.monto, 0);

  const saldoFinal = totalEntradas - totalSalidas;

  const exportarExcel = () => {
    const rows = [
      ["ESTADO DE CUENTA - " + metodosConfig[metodo].label],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN"],
      ["Total Entradas", `$${totalEntradas.toFixed(2)}`],
      ["Total Salidas", `$${totalSalidas.toFixed(2)}`],
      ["Saldo Final", `$${saldoFinal.toFixed(2)}`],
      [],
      ["EXTRACTO DE MOVIMIENTOS"],
      ["Fecha", "Tipo", "Concepto", "Entrada", "Salida", "Saldo"],
      ...movimientos.map(m => [
        format(parseISO(m.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        m.tipo,
        m.concepto,
        m.tipo === 'ENTRADA' ? `$${m.monto.toFixed(2)}` : '',
        m.tipo === 'SALIDA' ? `$${m.monto.toFixed(2)}` : '',
        `$${m.saldo.toFixed(2)}`
      ])
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estado_cuenta_${metodo}_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Estado de cuenta exportado");
  };

  const isLoading = loadingVentas || loadingPagos || loadingGastos || loadingComandas || loadingTasas || loadingPagosCxC || loadingCxC;

  // Determinar símbolo de moneda según método
  const simboloMoneda = (metodo === 'tarjeta_bs' || metodo === 'pago_movil_bs') ? 'Bs' : 
                        (metodo === 'nequi_cop') ? 'COP' : '$';

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Skeleton className="h-64 w-full" />
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
        <div className="flex items-center justify-between">
          <div>
            <Link to={createPageUrl('EstadosCuenta')}>
              <Button variant="outline" size="sm" className="mb-3">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-3xl">{metodosConfig[metodo].icono}</span>
              <span>{metodosConfig[metodo].label}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Estado de cuenta: {format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - {format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}
            </p>
          </div>
          <Button onClick={exportarExcel} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💰 Total Entradas</p>
                  <h3 className="text-2xl font-bold text-green-600">{simboloMoneda} {totalEntradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {movimientos.filter(m => m.tipo === 'ENTRADA').length} movimientos
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💸 Total Salidas</p>
                  <h3 className="text-2xl font-bold text-red-600">{simboloMoneda} {totalSalidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {movimientos.filter(m => m.tipo === 'SALIDA').length} movimientos
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-lg bg-gradient-to-br ${saldoFinal >= 0 ? 'from-blue-50 to-indigo-50' : 'from-red-50 to-rose-50'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">✅ Saldo Final</p>
                  <h3 className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {simboloMoneda} {saldoFinal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {movimientos.length} movimientos totales
                  </p>
                </div>
                <Receipt className={`w-8 h-8 ${saldoFinal >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Extracto de Movimientos */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-lg">📋 Extracto de Movimientos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {movimientos.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Entrada</TableHead>
                      <TableHead className="text-right">Salida</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((mov, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {format(parseISO(mov.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className={mov.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {mov.tipo === 'ENTRADA' ? '📥 Entrada' : '📤 Salida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{mov.concepto}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {mov.tipo === 'ENTRADA' ? `${simboloMoneda} ${mov.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {mov.tipo === 'SALIDA' ? `${simboloMoneda} ${mov.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${mov.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {simboloMoneda} {mov.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-blue-50 font-bold">
                      <TableCell colSpan={3}>TOTALES</TableCell>
                      <TableCell className="text-right text-green-700">
                        {simboloMoneda} {totalEntradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-red-700">
                        {simboloMoneda} {totalSalidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right text-lg ${saldoFinal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {simboloMoneda} {saldoFinal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay movimientos en este período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
