import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChefHat, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecetasPrimariasList({ recetas, detalles, onEdit, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="shadow-lg">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recetas.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-12 text-center">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay recetas primarias creadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recetas.map(receta => {
        const ingredientesReceta = detalles.filter(d => d.receta_primaria_id === receta.id);

        return (
          <Card key={receta.id} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-amber-600" />
                    {receta.nombre}
                  </CardTitle>
                  {receta.descripcion && (
                    <p className="text-sm text-gray-600 mt-1">{receta.descripcion}</p>
                  )}
                </div>
                <Badge variant={receta.activa ? "default" : "secondary"}>
                  {receta.activa ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Cantidad</p>
                  <p className="text-lg font-bold text-blue-600">
                    {receta.cantidad_resultante} {receta.unidad_medida}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Costo/Unidad</p>
                  <p className="text-lg font-bold text-green-600">
                    ${receta.costo_por_unidad.toFixed(2)}
                  </p>
                </div>
              </div>

              {receta.tiempo_preparacion > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{receta.tiempo_preparacion} minutos</span>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Ingredientes ({ingredientesReceta.length})
                </p>
                <div className="space-y-1">
                  {ingredientesReceta.slice(0, 3).map((det, idx) => (
                    <p key={idx} className="text-sm text-gray-600">
                      • {det.ingrediente_nombre}: {det.cantidad_requerida} {det.unidad_medida}
                    </p>
                  ))}
                  {ingredientesReceta.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{ingredientesReceta.length - 3} más
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-gray-600">Costo Total</p>
                <p className="text-xl font-bold text-amber-600">
                  ${receta.costo_total.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onEdit(receta)}
                  variant="outline"
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={() => onDelete(receta)}
                  variant="outline"
                  className="flex-1 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}