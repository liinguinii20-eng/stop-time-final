import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export default function TopPlatos({ detallesVentas, platos }) {
  // Calcular platos más vendidos
  const platoStats = {};
  detallesVentas.forEach(detalle => {
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
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          Top 5 Platos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topPlatos.length > 0 ? (
            topPlatos.map((plato, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-amber-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{plato.nombre}</p>
                    <p className="text-xs text-gray-500">{plato.cantidad} vendidos</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ${plato.total.toFixed(2)}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No hay datos de ventas aún</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}