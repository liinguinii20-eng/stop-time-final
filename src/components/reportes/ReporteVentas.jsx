import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "lucide-react";

export default function ReporteVentas({ ventas, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle>Ventas del Período</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-600" />
          Ventas del Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto">
          {ventas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ganancia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell className="text-sm">
                      {format(new Date(venta.fecha_hora), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{venta.metodo_pago}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${venta.total_venta.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      ${(venta.ganancia || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay ventas en este período
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}