import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function AlertasRecientes({ alertas, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Alertas de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Alertas de Stock Bajo
        </CardTitle>
        <Link to={createPageUrl("Alertas")}>
          <Button variant="outline" size="sm">Ver Todas</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {alertas.length > 0 ? (
          <div className="space-y-3">
            {alertas.slice(0, 5).map((alerta) => (
              <div key={alerta.id} className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{alerta.nombre_ingrediente}</p>
                    <p className="text-sm text-gray-500">
                      Stock: {alerta.cantidad_actual} | Mínimo: {alerta.cantidad_minima}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive">Bajo Stock</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay alertas de stock</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}