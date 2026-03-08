import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  "Alquiler": "#9333ea",
  "Servicios Básicos": "#3b82f6",
  "Nómina": "#10b981",
  "Marketing": "#ec4899",
  "Mantenimiento": "#eab308",
  "Impuestos": "#ef4444",
  "Otros": "#6b7280"
};

export default function ResumenGastos({ gastos }) {
  // Agrupar por categoría
  const gastosPorCategoria = {};
  gastos.forEach(gasto => {
    if (!gastosPorCategoria[gasto.categoria]) {
      gastosPorCategoria[gasto.categoria] = 0;
    }
    gastosPorCategoria[gasto.categoria] += gasto.monto;
  });

  const chartData = Object.entries(gastosPorCategoria).map(([categoria, monto]) => ({
    name: categoria,
    value: monto
  })).sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-xl">Distribución de Gastos del Mes</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[item.name] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">${item.value.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {((item.value / total) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay gastos registrados este mes
          </div>
        )}
      </CardContent>
    </Card>
  );
}