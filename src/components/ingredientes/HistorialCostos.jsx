import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const motivoLabels = {
  compra_nueva: "Compra Nueva",
  ajuste: "Ajuste de Precio",
  promocion: "Promoción",
  cambio_proveedor: "Cambio de Proveedor",
  otro: "Otro"
};

export default function HistorialCostos({ historial, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Costos</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!historial || historial.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Costos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">
            No hay cambios de costo registrados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Historial de Costos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {historial.map((cambio) => {
            const diferencia = cambio.costo_nuevo - cambio.costo_anterior;
            const porcentaje = cambio.costo_anterior > 0 
              ? ((diferencia / cambio.costo_anterior) * 100).toFixed(1)
              : 0;
            const esAumento = diferencia > 0;

            return (
              <div key={cambio.id} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {esAumento ? (
                      <TrendingUp className="w-4 h-4 text-red-600 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        ${cambio.costo_anterior.toFixed(2)} → ${cambio.costo_nuevo.toFixed(2)}
                      </p>
                      <p className={`text-xs ${esAumento ? 'text-red-600' : 'text-green-600'}`}>
                        {esAumento ? '+' : ''}{diferencia.toFixed(2)} ({esAumento ? '+' : ''}{porcentaje}%)
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {motivoLabels[cambio.motivo] || cambio.motivo}
                  </Badge>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    📅 {format(new Date(cambio.fecha_cambio), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                  {cambio.empleado_nombre && (
                    <p>👤 {cambio.empleado_nombre}</p>
                  )}
                  {cambio.proveedor && (
                    <p>🏪 {cambio.proveedor}</p>
                  )}
                  {cambio.notas && (
                    <p className="italic text-gray-500">"{cambio.notas}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}