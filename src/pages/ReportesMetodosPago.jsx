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

  const isLoading = loadingVentas || loadingPagos;

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
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
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
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <span className="leading-tight">Reportes por Método de Pago</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Análisis detallado de ingresos por canal
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
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total USD</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    ${totalGeneral.toFixed(2)}
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
                  <p className="text-xs text-gray-500 mb-1">Total Ventas</p>
                  <h3 className="text-2xl font-bold text-blue-600">{cantidadTotal}</h3>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Promedio</p>
                  <h3 className="text-2xl font-bold text-amber-600">
                    ${promedioVenta.toFixed(2)}
                  </h3>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métodos en Dólares */}
        {grupos.dólares.length > 0 && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-lg">💵 Métodos en Dólares</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                {grupos.dólares.map(metodo => (
                  <div key={metodo.key} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{metodo.label}</p>
                      <p className="text-sm text-gray-500">{metodo.cantidad} ventas • Promedio: ${(metodo.total_usd / metodo.cantidad).toFixed(2)}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-xl font-bold text-green-600">
                        ${metodo.total_usd.toFixed(2)}
                      </p>
                    </div>
                    <Link to={createPageUrl(`ReporteDetalle?metodo=${metodo.key}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalle
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Métodos en Pesos */}
        {grupos.pesos.length > 0 && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="text-lg">🇨🇴 Métodos en Pesos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                {grupos.pesos.map(metodo => (
                  <div key={metodo.key} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{metodo.label}</p>
                      <p className="text-sm text-gray-500">{metodo.cantidad} ventas • Promedio: ${(metodo.total_usd / metodo.cantidad).toFixed(2)}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-xl font-bold text-blue-600">
                        ${metodo.total_usd.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ₡ {metodo.total_original.toLocaleString('es-ES')}
                      </p>
                    </div>
                    <Link to={createPageUrl(`ReporteDetalle?metodo=${metodo.key}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalle
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Métodos en Bolívares */}
        {grupos.bolívares.length > 0 && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <CardTitle className="text-lg">🇻🇪 Métodos en Bolívares</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                {grupos.bolívares.map(metodo => (
                  <div key={metodo.key} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{metodo.label}</p>
                      <p className="text-sm text-gray-500">{metodo.cantidad} ventas • Promedio: ${(metodo.total_usd / metodo.cantidad).toFixed(2)}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-xl font-bold text-amber-600">
                        ${metodo.total_usd.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Bs {metodo.total_original.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Link to={createPageUrl(`ReporteDetalle?metodo=${metodo.key}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalle
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
