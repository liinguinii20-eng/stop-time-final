import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function ReportePlatosTop({ detalles, platos }) {
  // Agrupar por plato
  const platoStats = {};
  detalles.forEach(detalle => {
    if (!platoStats[detalle.plato_id]) {
      platoStats[detalle.plato_id] = {
        nombre: detalle.plato_nombre,
        cantidad: 0,
        total: 0,
      };
    }
    platoStats[detalle.plato_id].cantidad += detalle.cantidad;
    platoStats[detalle.plato_id].total += detalle.subtotal;
  });

  const topPlatos = Object.values(platoStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Top 5 Platos por Ingresos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topPlatos.length > 0 ? (
            topPlatos.map((plato, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-amber-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{plato.nombre}</p>
                    <p className="text-sm text-gray-500">{plato.cantidad} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">${plato.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">en ventas</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay datos en este período
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}