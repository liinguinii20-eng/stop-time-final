import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function VentasChart({ ventas, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para los últimos 7 días
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const ventasDelDia = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha_hora);
      return fechaVenta >= startOfDay(date) && fechaVenta <= endOfDay(date);
    });
    
    chartData.push({
      fecha: format(date, "EEE dd", { locale: es }),
      ventas: ventasDelDia.reduce((sum, v) => sum + v.total_venta, 0),
      ganancias: ventasDelDia.reduce((sum, v) => sum + (v.ganancia || 0), 0),
    });
  }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-xl">Ventas de los Últimos 7 Días</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="fecha" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              formatter={(value) => `$${value.toFixed(2)}`}
            />
            <Line 
              type="monotone" 
              dataKey="ventas" 
              stroke="#C5A572" 
              strokeWidth={3}
              name="Ventas"
              dot={{ fill: '#C5A572', r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="ganancias" 
              stroke="#10b981" 
              strokeWidth={3}
              name="Ganancias"
              dot={{ fill: '#10b981', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}