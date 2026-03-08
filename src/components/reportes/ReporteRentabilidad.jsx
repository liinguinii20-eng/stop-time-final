import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function ReporteRentabilidad({ detalles, platos }) {
  // Calcular rentabilidad por plato
  const rentabilidadPorPlato = {};
  
  detalles.forEach(detalle => {
    if (!rentabilidadPorPlato[detalle.plato_id]) {
      rentabilidadPorPlato[detalle.plato_id] = {
        nombre: detalle.plato_nombre,
        cantidadVendida: 0,
        totalVentas: 0,
        totalCostos: 0,
      };
    }
    rentabilidadPorPlato[detalle.plato_id].cantidadVendida += detalle.cantidad;
    rentabilidadPorPlato[detalle.plato_id].totalVentas += detalle.subtotal;
    rentabilidadPorPlato[detalle.plato_id].totalCostos += (detalle.costo_unitario || 0) * detalle.cantidad;
  });

  const rentabilidadArray = Object.values(rentabilidadPorPlato).map(plato => ({
    ...plato,
    ganancia: plato.totalVentas - plato.totalCostos,
    margen: plato.totalVentas > 0 ? ((plato.totalVentas - plato.totalCostos) / plato.totalVentas * 100) : 0
  })).sort((a, b) => b.ganancia - a.ganancia);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-xl">Rentabilidad por Plato</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {rentabilidadArray.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Plato</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Costos</TableHead>
                  <TableHead>Ganancia</TableHead>
                  <TableHead>Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentabilidadArray.map((plato, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{plato.nombre}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{plato.cantidadVendida}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${plato.totalVentas.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      ${plato.totalCostos.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      ${plato.ganancia.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {plato.margen >= 50 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-semibold ${
                          plato.margen >= 50 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {plato.margen.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay datos de rentabilidad en este período
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}