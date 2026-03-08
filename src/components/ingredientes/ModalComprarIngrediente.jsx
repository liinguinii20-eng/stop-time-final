import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, AlertTriangle, CheckCircle, ShoppingCart, DollarSign, History, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function IngredientesList({ ingredientes, onEdit, onNuevoCosto, onVerHistorial, onComprar, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (ingredientes.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No se encontraron ingredientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      {/* Vista móvil - Cards */}
      <div className="block lg:hidden p-4 space-y-3">
        {ingredientes.map((ingrediente) => {
          const bajoStock = ingrediente.cantidad_disponible <= ingrediente.cantidad_minima;
          return (
            <div key={ingrediente.id} className={`border rounded-lg p-4 space-y-3 ${bajoStock ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm truncate">{ingrediente.nombre}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{ingrediente.unidad_medida}</Badge>
                    {bajoStock ? (
                      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Bajo Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        OK
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(ingrediente)}
                  className="hover:bg-amber-50 hover:text-amber-600 flex-shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(ingrediente)}
                  className="hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Costo/Unidad</p>
                  <p className="font-semibold text-gray-900">${ingrediente.costo_por_unidad.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Stock</p>
                  <p className={`font-semibold ${bajoStock ? 'text-red-600' : 'text-green-600'}`}>
                    {ingrediente.cantidad_disponible} {ingrediente.unidad_medida}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Mínimo</p>
                  <p className="font-semibold text-gray-900">{ingrediente.cantidad_minima} {ingrediente.unidad_medida}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Proveedor</p>
                  <p className="font-semibold text-gray-900 truncate">{ingrediente.proveedor || "-"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Costo/Unidad</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredientes.map((ingrediente) => {
              const bajoStock = ingrediente.cantidad_disponible <= ingrediente.cantidad_minima;
              return (
                <TableRow key={ingrediente.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{ingrediente.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ingrediente.unidad_medida}</Badge>
                  </TableCell>
                  <TableCell>${ingrediente.costo_por_unidad.toFixed(2)}</TableCell>
                  <TableCell className={bajoStock ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                    {ingrediente.cantidad_disponible} {ingrediente.unidad_medida}
                  </TableCell>
                  <TableCell>{ingrediente.cantidad_minima} {ingrediente.unidad_medida}</TableCell>
                  <TableCell>
                    {bajoStock ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        Bajo Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        OK
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">{ingrediente.proveedor || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(ingrediente)}
                        className="hover:bg-amber-50 hover:text-amber-600"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onComprar && onComprar(ingrediente)}
                        className="hover:bg-green-50 hover:text-green-600"
                        title="Comprar"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onNuevoCosto(ingrediente)}
                        className="hover:bg-purple-50 hover:text-purple-600"
                        title="Nuevo costo"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onVerHistorial(ingrediente)}
                        className="hover:bg-blue-50 hover:text-blue-600"
                        title="Historial"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(ingrediente)}
                        className="hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}