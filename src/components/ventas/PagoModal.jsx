import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, Smartphone, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PagoModal({ total, onConfirmar, onCancelar, isLoading }) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const metodosPago = [
    { valor: "Efectivo", icono: Banknote, color: "bg-green-100 text-green-700 border-green-300" },
    { valor: "Tarjeta", icono: CreditCard, color: "bg-blue-100 text-blue-700 border-blue-300" },
    { valor: "Transferencia", icono: Smartphone, color: "bg-purple-100 text-purple-700 border-purple-300" },
  ];

  const handleConfirmar = () => {
    if (isLoading) return;
    onConfirmar(metodoPago);
  };

  return (
    <Dialog open={true} onOpenChange={onCancelar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Confirmar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 text-center mb-1">Total a Pagar</p>
              <p className="text-4xl font-bold text-amber-700 text-center">
                ${total.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          {/* Métodos de Pago */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Selecciona el Método de Pago:</p>
            <div className="space-y-3">
              {metodosPago.map((metodo) => {
                const Icono = metodo.icono;
                const esSeleccionado = metodoPago === metodo.valor;
                
                return (
                  <button
                    key={metodo.valor}
                    type="button"
                    onClick={() => setMetodoPago(metodo.valor)}
                    disabled={isLoading}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${
                      esSeleccionado
                        ? `${metodo.color} border-current shadow-md scale-105`
                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className={`p-2 rounded-lg ${esSeleccionado ? "bg-white bg-opacity-50" : "bg-gray-100"}`}>
                      <Icono className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-lg">{metodo.valor}</span>
                    {esSeleccionado && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-current flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensaje de procesamiento */}
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-900">Procesando venta...</p>
                  <p className="text-sm text-blue-700">Actualizando inventario automáticamente</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            disabled={isLoading}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Confirmar Venta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}