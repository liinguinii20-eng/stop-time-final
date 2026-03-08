import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle, XCircle, Package, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatosList({ platos, recetas, recetasPrimarias = [], recetasSecundarias = [], ingredientes = [], onEdit, onDelete, isLoading, empleado }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="shadow-lg">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (platos.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No se encontraron platos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {platos.map((plato) => {
        const recetasPlato = recetas?.filter(r => r.plato_id === plato.id) || [];

        return (
          <Card key={plato.id} className="shadow-lg border-none hover:shadow-xl transition-shadow">
            <CardContent className="p-6 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plato.nombre}</h3>
                  <Badge variant="outline" className="mb-2">{plato.categoria}</Badge>
                  {plato.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">{plato.descripcion}</p>
                  )}
                </div>
                {plato.activo ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Stats */}
              <div className={`grid ${empleado?.rol === 'administrador' ? 'grid-cols-2' : 'grid-cols-2'} gap-3 py-3 border-y`}>
                <div>
                  <p className="text-xs text-gray-500">Precio Venta</p>
                  {plato.tiene_piezas ? (
                    <div className="text-sm font-medium text-green-600">
                      <div>6pz: ${plato.precio_6?.toFixed(2)}</div>
                      <div>12pz: ${plato.precio_12?.toFixed(2)}</div>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-green-600">${plato.precio.toFixed(2)}</p>
                  )}
                </div>
                
                {empleado?.rol === 'administrador' ? (
                  <div>
                    <p className="text-xs text-gray-500">Costo Real</p>
                    <p className="text-lg font-bold text-amber-600">
                      ${(plato.costo_total || 0).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500">Ingredientes</p>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4 text-blue-600" />
                      <p className="text-lg font-bold text-blue-600">{recetasPlato.length}</p>
                    </div>
                  </div>
                )}
              </div>

              {empleado?.rol === 'administrador' && (
                 <div className="mt-2 mb-3 bg-gray-50 p-2 rounded text-xs flex justify-between">
                   <span>Margen: <span className={(plato.precio - (plato.costo_total || 0)) >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>${(plato.precio - (plato.costo_total || 0)).toFixed(2)}</span></span>
                   <span>Sugerido: <span className="text-gray-600">${(plato.precio_sugerido || 0).toFixed(2)}</span></span>
                 </div>
              )}

              {/* Lista de Elementos de la Receta */}
              {recetasPlato.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Receta:</p>
                  <div className="space-y-1">
                    {recetasPlato.slice(0, 3).map((receta, idx) => {
                      // Intentar encontrar el elemento en ingredientes, recetas primarias o secundarias
                      const ingrediente = ingredientes?.find(i => i.id === receta.ingrediente_id);
                      const recetaPrimaria = recetasPrimarias?.find(r => r.id === receta.ingrediente_id);
                      const recetaSecundaria = recetasSecundarias?.find(r => r.id === receta.ingrediente_id);
                      const elemento = ingrediente || recetaPrimaria || recetaSecundaria;
                      
                      return (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-700">{receta.ingrediente_nombre}</span>
                          <span className="text-amber-700 font-medium">
                            {receta.cantidad_requerida} {elemento?.unidad_medida || ''}
                          </span>
                        </div>
                      );
                    })}
                    {recetasPlato.length > 3 && (
                      <p className="text-xs text-gray-500 italic">
                        +{recetasPlato.length - 3} elementos más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {recetasPlato.length === 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Sin elementos asignados
                  </p>
                </div>
              )}

              {/* Actions */}
              {(onEdit || onDelete) && (
                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onEdit(plato)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar Receta
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      className="flex-shrink-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      onClick={() => onDelete(plato)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}