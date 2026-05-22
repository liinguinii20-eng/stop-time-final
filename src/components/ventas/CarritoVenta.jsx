import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function CarritoVenta({ carrito, onActualizarCantidad, onEliminar, onProcesar, total, costoTotal }) {
  const ganancia = total - costoTotal;
  const margen = total > 0 ? (ganancia / total * 100) : 0;

  return (
    <Card className="shadow-lg border-none sticky top-4">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Carrito ({carrito.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {carrito.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">El carrito está vacío</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {carrito.map(item => (
              <div key={item.plato.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.plato.nombre}</h4>
                  <p className="text-xs text-gray-500">
                    ${item.plato.precio.toFixed(2)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={item.cantidad}
                    onChange={(e) => onActualizarCantidad(item.plato.id, parseFloat(e.target.value) || 0)}
                    className="w-16 h-8 text-center"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEliminar(item.plato.id)}
                    className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="font-semibold text-green-600">
                  ${(item.plato.precio * item.cantidad).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {carrito.length > 0 && (
        <>
          <Separator />
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Costo Total:</span>
              <span className="font-semibold text-red-600">${costoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ganancia:</span>
              <span className="font-semibold text-green-600">${ganancia.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Margen:</span>
              <span className="font-semibold text-amber-600">{margen.toFixed(1)}%</span>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              onClick={onProcesar}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Procesar Venta
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}