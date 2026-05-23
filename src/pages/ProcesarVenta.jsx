import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import PlatosSelector from "../components/ventas/PlatosSelector";
import CarritoVenta from "../components/ventas/CarritoVenta";
import PagoModal from "../components/ventas/PagoModal";
// NOTA: El descuento de inventario se maneja exclusivamente en el backend (POST /ventas)
// No llamar descontarStock desde el frontend para evitar doble descuento.

export default function ProcesarVenta() {
  const [carrito, setCarrito] = useState([]);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: platos = [] } = useQuery({
    queryKey: ['platos'],
    queryFn: () => base44.entities.Plato.list(),
  });

  const { data: recetas = [] } = useQuery({
    queryKey: ['recetas'],
    queryFn: () => base44.entities.Receta.list(),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  const procesarVentaMutation = useMutation({
    mutationFn: async (ventaData) => {
      try {
        // 1. Crear la venta CON DETALLES para que el backend pueda descontar inventario
        const venta = await base44.entities.Venta.create({
          fecha_hora: new Date().toISOString(),
          total_venta: ventaData.total,
          metodo_pago: ventaData.metodoPago,
          costo_total: 0,
          ganancia: 0,
          detalles: carrito.map(item => ({
            plato_id: item.plato.id,
            plato_nombre: item.plato.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.plato.precio,
            subtotal: item.plato.precio * item.cantidad
          }))
        });

        // 2. El backend POST /ventas ya maneja:
        //    - Inserción de DetalleVenta
        //    - Explosión de materiales (BOM)
        //    - Descuento de inventario
        // NO descontar aquí para evitar doble descuento.
        console.log('✅ VENTA PROCESADA - El backend manejará el descuento de inventario');

        return venta;
      } catch (error) {
        console.error("Error procesando venta:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      setCarrito([]);
      setShowPagoModal(false);
      toast.success("¡Venta procesada exitosamente!", {
        description: "El inventario se ha actualizado automáticamente"
      });
    },
    onError: (error) => {
      console.error("Error completo:", error);
      toast.error("Error al procesar la venta", {
        description: "Por favor intenta nuevamente"
      });
    }
  });

  const agregarAlCarrito = (plato) => {
    const itemExistente = carrito.find(item => item.plato.id === plato.id);
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.plato.id === plato.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { plato, cantidad: 1 }]);
    }
    toast.success(`${plato.nombre} agregado al carrito`);
  };

  const actualizarCantidad = (platoId, cantidad) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(platoId);
      return;
    }
    setCarrito(carrito.map(item =>
      item.plato.id === platoId
        ? { ...item, cantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (platoId) => {
    setCarrito(carrito.filter(item => item.plato.id !== platoId));
    toast.info("Plato eliminado del carrito");
  };

  const total = carrito.reduce((sum, item) => sum + (item.plato.precio * item.cantidad), 0);

  const handleProcesarVenta = (metodoPago) => {
    if (carrito.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    
    procesarVentaMutation.mutate({ total, metodoPago });
  };

  const platosActivos = platos.filter(p => p.activo);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
            <span className="leading-tight">Procesar Venta</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Selecciona platos - El inventario se actualizará automáticamente
          </p>
        </div>

        {/* Alert Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs sm:text-sm font-bold">i</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-blue-900 text-sm sm:text-base">Actualización Automática de Inventario</p>
              <p className="text-xs sm:text-sm text-blue-700 mt-1">
                Al procesar una venta, el sistema descuenta automáticamente los ingredientes del inventario según las recetas de cada plato. Si algún ingrediente queda bajo el mínimo, se genera una alerta de stock.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Platos Selector */}
          <div className="lg:col-span-2">
            <PlatosSelector
              platos={platosActivos}
              onAgregar={agregarAlCarrito}
            />
          </div>

          {/* Carrito */}
          <div>
            <CarritoVenta
              carrito={carrito}
              onActualizarCantidad={actualizarCantidad}
              onEliminar={eliminarDelCarrito}
              onProcesar={() => setShowPagoModal(true)}
              total={total}
              costoTotal={0}
            />
          </div>
        </div>

        {/* Pago Modal */}
        {showPagoModal && (
          <PagoModal
            total={total}
            onConfirmar={handleProcesarVenta}
            onCancelar={() => setShowPagoModal(false)}
            isLoading={procesarVentaMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
