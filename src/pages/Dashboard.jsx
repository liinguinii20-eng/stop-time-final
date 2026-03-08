import { useMemo } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Package, 
  UtensilsCrossed, 
  DollarSign, 
  AlertTriangle,
  Calendar,
  ShoppingCart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Componente de Tarjeta de Estadísticas optimizado
function StatsCard({ title, value, subtitle, icon: Icon, color, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-md border-none">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const colorMap = {
    green: "from-green-500 to-emerald-600",
    amber: "from-amber-500 to-orange-600",
    blue: "from-blue-500 to-indigo-600",
    red: "from-red-500 to-rose-600",
    purple: "from-purple-500 to-violet-600",
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-none bg-white">
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 truncate">{title}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{value}</h3>
          </div>
          <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-sm flex-shrink-0`}>
            <Icon className="w-5 h-5 sm:w-6 h-6 text-white" />
          </div>
        </div>
        <p className={`text-xs font-medium ${subtitle.includes('pérdidas') || subtitle.includes('Bajo') ? 'text-red-500' : 'text-gray-400'}`}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const today = new Date();

  // --- QUERIES ---
  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Venta.list('-created_date', 200),
  });

  const { data: platos = [], isLoading: loadingPlatos } = useQuery({
    queryKey: ['platos'],
    queryFn: () => base44.entities.Plato.list(),
  });

  const { data: ingredientes = [], isLoading: loadingIngredientes } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  const { data: alertas = [], isLoading: loadingAlertas } = useQuery({
    queryKey: ['alertas'],
    queryFn: () => base44.entities.AlertaStock.filter({ resuelta: false }, '-created_date', 10),
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 200),
  });

  // --- CÁLCULOS MEMOIZADOS ---
  // Esto evita que JavaScript procese los filtros en cada renderizado innecesario
  const processedData = useMemo(() => {
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfMo = startOfMonth(today);
    const endOfMo = endOfMonth(today);

    // Cálculos de Hoy
    const vHoy = ventas.filter(v => {
      const d = new Date(v.fecha_hora);
      return d >= startOfToday && d <= endOfToday;
    });
    const gHoy = gastos.filter(g => {
      const d = new Date(g.fecha_gasto);
      return d >= startOfToday && d <= endOfToday;
    });

    const totalVentasHoy = vHoy.reduce((sum, v) => sum + v.total_venta, 0);
    const totalGastosHoy = gHoy.reduce((sum, g) => sum + g.monto, 0);

    // Cálculos del Mes
    const vMes = ventas.filter(v => {
      const d = new Date(v.fecha_hora);
      return d >= startOfMo && d <= endOfMo;
    });
    const gMes = gastos.filter(g => {
      const d = new Date(g.fecha_gasto);
      return d >= startOfMo && d <= endOfMo;
    });

    const totalVentasMes = vMes.reduce((sum, v) => sum + v.total_venta, 0);
    const totalGastosMes = gMes.reduce((sum, g) => sum + g.monto, 0);

    // Operaciones
    const platosActivos = platos.filter(p => p.activo).length;
    const bajoStockCount = ingredientes.filter(i => i.cantidad_disponible <= i.cantidad_minima).length;

    // Gráfico de 7 días
    const chartData = [...Array(7)].map((_, i) => {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const vDia = ventas
        .filter(v => { const d = new Date(v.fecha_hora); return d >= dayStart && d <= dayEnd; })
        .reduce((sum, v) => sum + v.total_venta, 0);

      const gDia = gastos
        .filter(g => { const d = new Date(g.fecha_gasto); return d >= dayStart && d <= dayEnd; })
        .reduce((sum, g) => sum + g.monto, 0);

      return {
        fecha: format(date, "EEE dd", { locale: es }),
        ventas: vDia,
        gastos: gDia,
        ganancia: vDia - gDia,
      };
    }).reverse();

    return {
      hoy: { totalVentas: totalVentasHoy, totalGastos: totalGastosHoy, ganancia: totalVentasHoy - totalGastosHoy, count: vHoy.length, gCount: gHoy.length },
      mes: { totalVentas: totalVentasMes, totalGastos: totalGastosMes, ganancia: totalVentasMes - totalGastosMes, count: vMes.length, gCount: gMes.length },
      ops: { platosActivos, bajoStockCount },
      chartData
    };
  }, [ventas, gastos, platos, ingredientes, today]);

  const { hoy, mes, ops, chartData } = processedData;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard General</h1>
            <p className="text-sm sm:text-base text-gray-500 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>{format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </p>
          </div>
        </div>

        {/* Stats de Hoy */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded-full" /> Resumen de Hoy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <StatsCard
              title="Ventas de Hoy"
              value={`$${hoy.totalVentas.toLocaleString()}`}
              subtitle={`${hoy.count} pedidos realizados`}
              icon={ShoppingCart}
              color="green"
              isLoading={loadingVentas}
            />
            <StatsCard
              title="Gastos de Hoy"
              value={`$${hoy.totalGastos.toLocaleString()}`}
              subtitle={`${hoy.gCount} egresos registrados`}
              icon={DollarSign}
              color="red"
              isLoading={loadingGastos}
            />
            <StatsCard
              title="Ganancia de Hoy"
              value={`$${hoy.ganancia.toLocaleString()}`}
              subtitle={hoy.ganancia >= 0 ? "Flujo positivo" : "Día con pérdidas"}
              icon={TrendingUp}
              color={hoy.ganancia >= 0 ? "purple" : "red"}
              isLoading={loadingVentas || loadingGastos}
            />
          </div>
        </section>

        {/* Stats del Mes y Operaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-md border-none overflow-hidden">
            <CardHeader className="bg-white border-b border-gray-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Tendencia de la Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-white">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(val) => `$${val.toLocaleString()}`}
                    />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} name="Ventas" />
                    <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444'}} name="Gastos" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <StatsCard
              title="Platos Activos"
              value={ops.platosActivos}
              subtitle="Disponibles en el menú"
              icon={UtensilsCrossed}
              color="blue"
              isLoading={loadingPlatos}
            />
            <StatsCard
              title="Stock Crítico"
              value={ops.bajoStockCount}
              subtitle={`${alertas.length} alertas sin resolver`}
              icon={AlertTriangle}
              color="amber"
              isLoading={loadingIngredientes || loadingAlertas}
            />
          </div>
        </div>

        {/* Alertas de Stock Detalladas */}
        {alertas.length > 0 && (
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                Insumos a Reponer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {alertas.slice(0, 5).map((alerta) => (
                  <div key={alerta.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{alerta.nombre_ingrediente}</p>
                        <p className="text-xs text-gray-500">Actual: {alerta.cantidad_actual} / Mínimo: {alerta.cantidad_minima}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded uppercase tracking-wider">
                        Urgente
                      </span>
                    </div>
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
