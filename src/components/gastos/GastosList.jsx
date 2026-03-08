import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoriaColors = {
  "Alquiler": "bg-purple-100 text-purple-800 border-purple-200",
  "Servicios Básicos": "bg-blue-100 text-blue-800 border-blue-200",
  "Nómina": "bg-green-100 text-green-800 border-green-200",
  "Marketing": "bg-pink-100 text-pink-800 border-pink-200",
  "Mantenimiento": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Impuestos": "bg-red-100 text-red-800 border-red-200",
  "Otros": "bg-gray-100 text-gray-800 border-gray-200"
};

const metodosConfig = {
  efectivo_usd: { grupo: "USD" },
  binance_usd: { grupo: "USD" },
  zinli_usd: { grupo: "USD" },
  paypal_usd: { grupo: "USD" },
  zelle_usd: { grupo: "USD" },
  nequi_cop: { grupo: "COP" },
  tarjeta_bs: { grupo: "VES" },
  pago_movil_bs: { grupo: "VES" }
};

export default function GastosList({ gastos, onEdit, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (gastos.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron gastos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Recurrente</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastos.map((gasto) => (
              <TableRow key={gasto.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {format(new Date(gasto.fecha_gasto), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-xs">
                  {gasto.descripcion}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={categoriaColors[gasto.categoria]}>
                    {gasto.categoria}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold text-red-600">
                  ${gasto.monto.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{gasto.metodo_pago}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {gasto.comprobante || "-"}
                </TableCell>
                <TableCell>
                  {gasto.recurrente ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      Sí
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(gasto)}
                      className="hover:bg-amber-50 hover:text-amber-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(gasto)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}