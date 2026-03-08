import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Clock, User, Utensils, Eye, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ComandaPrintView from "./ComandaPrintView";

export default function ComandasList({ comandas, detalles, onVerDetalle, isLoading }) {
  const [comandaImprimir, setComandaImprimir] = useState(null);
  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (comandas.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-8 sm:p-12 text-center">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm sm:text-base">No se encontraron comandas</p>
        </CardContent>
      </Card>
    );
  }

  const estadoConfig = {
    abierta: { color: "bg-green-100 text-green-800 border-green-200", label: "Abierta" },
    cerrada: { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Cerrada" },
    pagada: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Pagada" }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {comandas.map((comanda) => {
        const platosComanda = detalles.filter(d => d.comanda_id === comanda.id);
        const totalPlatos = platosComanda.reduce((sum, d) => sum + d.cantidad, 0);
        const estadoInfo = estadoConfig[comanda.estado] || estadoConfig.abierta;

        return (
          <Card key={comanda.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-none">
            <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">{comanda.numero_comanda}</span>
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {format(new Date(comanda.fecha_apertura), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </p>
                </div>
                <Badge className={`${estadoInfo.color} border text-xs`}>
                  {estadoInfo.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <span className="text-lg">🪑</span>
                    Mesa:
                  </span>
                  <span className="font-semibold text-gray-900">{comanda.mesa_numero}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Mesero:
                  </span>
                  <span className="font-semibold text-gray-900 truncate max-w-[150px]">
                    {comanda.mesero_nombre}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Platos:
                  </span>
                  <span className="font-semibold text-amber-600">{totalPlatos}</span>
                </div>
              </div>

              {comanda.notas && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 italic">"{comanda.notas}"</p>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className="text-xl sm:text-2xl font-bold text-amber-600">
                    ${comanda.total_comanda.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => onVerDetalle(comanda)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalle
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setComandaImprimir(comanda);
                  }}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-3"
                  title="Imprimir comanda"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Modal de impresión */}
      <ComandaPrintView
        isOpen={!!comandaImprimir}
        onClose={() => setComandaImprimir(null)}
        comanda={comandaImprimir}
        detalles={comandaImprimir ? detalles.filter(d => d.comanda_id === comandaImprimir.id) : []}
        tipo="caja"
      />
    </div>
  );
}