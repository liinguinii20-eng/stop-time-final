import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdelantosList({ adelantos, onEdit, onDelete, onMarcarDescontado, isLoading }) {
  if (isLoading) {
    return <p className="text-center text-gray-500 py-8">Cargando...</p>;
  }

  if (adelantos.length === 0) {
    return <p className="text-center text-gray-500 py-8">No hay adelantos registrados</p>;
  }

  const metodosLabels = {
    efectivo_usd: "Efectivo USD",
    tarjeta_bs: "Tarjeta Bs",
    pago_movil_bs: "Pago Móvil",
    binance_usd: "Binance",
    zinli_usd: "Zinli",
    efectivo_cop: "Efectivo COP",
    nequi_cop: "Nequi",
    paypal_usd: "PayPal",
    zelle_usd: "Zelle"
  };

  return (
    <div className="space-y-3">
      {adelantos.map((adelanto) => (
        <Card key={adelanto.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{adelanto.empleado_nombre}</h3>
                  <Badge variant={adelanto.estado?.toLowerCase() === "descontado" ? "default" : "secondary"}>
                    {adelanto.estado?.toLowerCase() === "descontado" ? "Descontado" : "Pendiente"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Monto:</span>{' '}
                    {adelanto.moneda_original === 'BS' ? (
                      `Bs ${(adelanto.monto_original ?? 0).toFixed(2)} ($${(adelanto.monto ?? 0).toFixed(2)})`
                    ) : adelanto.moneda_original === 'COP' ? (
                      `COP ${(adelanto.monto_original ?? 0).toFixed(2)} ($${(adelanto.monto ?? 0).toFixed(2)})`
                    ) : (
                      `$${(adelanto.monto ?? 0).toFixed(2)}`
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Método:</span> {metodosLabels[adelanto.metodo_pago] || adelanto.metodo_pago || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {format(new Date(adelanto.fecha_adelanto), "dd/MM/yyyy", { locale: es })}
                  </div>
                  {adelanto.notas && (
                    <div className="col-span-2">
                      <span className="font-medium">Notas:</span> {adelanto.notas}
                    </div>
                  )}
                </div>
              </div>
 
              <div className="flex gap-2">
                {adelanto.estado?.toLowerCase() === "pendiente" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarcarDescontado(adelanto)}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(adelanto)}
                  disabled={adelanto.estado?.toLowerCase() === "descontado"}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(adelanto)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}