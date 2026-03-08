import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer, X, ChefHat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function ImprimirComanda() {
  const urlParams = new URLSearchParams(window.location.search);
  const comandaId = urlParams.get('comanda_id');
  const tipo = urlParams.get('tipo') || 'caja'; // 'caja' o 'cocina'

  const { data: comanda, isLoading: loadingComanda } = useQuery({
    queryKey: ['comanda', comandaId],
    queryFn: async () => {
      const comandas = await base44.entities.Comanda.filter({ id: comandaId });
      return comandas[0];
    },
    enabled: !!comandaId
  });

  const { data: detalles = [] } = useQuery({
    queryKey: ['detalles-comanda', comandaId],
    queryFn: () => base44.entities.DetalleComanda.filter({ comanda_id: comandaId }),
    enabled: !!comandaId
  });

  // Configuración del restaurante
  const configRestaurante = {
    nombre: "STOP TIME SUSHI",
    mensaje_footer: "¡Gracias por su preferencia!"
  };

  if (loadingComanda || !comanda) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando comanda...</p>
      </div>
    );
  }

  // Calcular total (SIN IVA)
  const total = detalles.reduce((sum, d) => sum + (d.subtotal || 0), 0);

  const fechaComanda = comanda.fecha_apertura 
    ? format(parseISO(comanda.fecha_apertura), "dd/MM/yyyy", { locale: es })
    : 'N/A';
  const horaComanda = comanda.fecha_apertura 
    ? format(parseISO(comanda.fecha_apertura), "HH:mm", { locale: es })
    : 'N/A';

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  // Vista para COCINA (simplificada)
  if (tipo === 'cocina') {
    return (
      <>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { 
              font-family: 'Courier New', monospace !important;
              font-size: 14px !important;
              margin: 0 !important;
              padding: 10px !important;
            }
            .comanda-cocina {
              width: 80mm !important;
              margin: 0 auto !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>

        <div className="min-h-screen bg-gray-100 p-4">
          <div className="comanda-cocina max-w-[80mm] mx-auto bg-white p-4 font-mono text-sm border border-gray-300 shadow-lg">
            {/* Header Cocina */}
            <div className="text-center border-b-2 border-black pb-3 mb-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ChefHat className="w-6 h-6" />
                <h2 className="text-xl font-bold">COCINA</h2>
              </div>
              <h3 className="text-lg font-bold">COMANDA #{comanda.numero_comanda}</h3>
              <p className="mt-2">
                <strong>Mesa:</strong> {comanda.mesa_numero} | <strong>Hora:</strong> {horaComanda}
              </p>
            </div>

            {/* Items */}
            <div className="my-4">
              {detalles.map((detalle, idx) => (
                <div key={idx} className="my-3 pb-3 border-b border-dashed border-gray-400">
                  <div className="text-base font-bold">
                    {detalle.cantidad}x {detalle.plato_nombre}
                  </div>
                  {detalle.notas_plato && (
                    <div className="text-red-600 italic mt-1">
                      ⚠️ {detalle.notas_plato}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-4 pt-3 border-t border-gray-300">
              Impreso: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          </div>

          {/* Botones */}
          <div className="no-print flex justify-center gap-4 mt-6">
            <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700">
              <Printer className="w-4 h-4 mr-2" />
              IMPRIMIR PARA COCINA
            </Button>
            <Button onClick={handleClose} variant="outline">
              <X className="w-4 h-4 mr-2" />
              CERRAR
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Vista para CAJA (completa con precios)
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            font-family: 'Courier New', monospace !important;
            font-size: 12px !important;
            margin: 0 !important;
            padding: 10px !important;
          }
          .comanda-print {
            width: 80mm !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="comanda-print max-w-[80mm] mx-auto bg-white p-4 font-mono text-xs border border-gray-300 shadow-lg">
          {/* Header */}
          <div className="text-center border-b border-dashed border-black pb-3 mb-3">
            <h2 className="text-lg font-bold">{configRestaurante.nombre}</h2>
          </div>

          {/* Info Comanda */}
          <div className="text-center mb-4 pb-3 border-b border-gray-300">
            <h3 className="text-base font-bold">COMANDA #{comanda.numero_comanda}</h3>
            <p><strong>Mesa:</strong> {comanda.mesa_numero}</p>
            <p><strong>Mesero:</strong> {comanda.mesero_nombre}</p>
            <p><strong>Fecha:</strong> {fechaComanda}</p>
            <p><strong>Hora:</strong> {horaComanda}</p>
          </div>

          {/* Detalle de Pedidos */}
          <div className="mb-4">
            <div className="border-b border-black mb-2 pb-1">
              <strong>PEDIDO</strong>
            </div>
            
            {detalles.map((detalle, idx) => (
              <div key={idx} className="my-2 pb-2 border-b border-dotted border-gray-300">
                <div className="flex justify-between">
                  <span><strong>{detalle.cantidad}x</strong> {detalle.plato_nombre}</span>
                  <span>${detalle.subtotal?.toFixed(2)}</span>
                </div>
                {detalle.notas_plato && (
                  <div className="text-[10px] text-gray-600 italic">
                    Nota: {detalle.notas_plato}
                  </div>
                )}
                <div className="text-[10px] text-gray-500">
                  ${detalle.precio_unitario?.toFixed(2)} c/u
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t-2 border-black pt-3 mt-4">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL A PAGAR:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Equivalentes en monedas */}
          {comanda.total_cop > 0 && (
            <div className="mt-3 pt-2 border-t border-dashed text-[10px] text-gray-600">
              <p>COP: ${comanda.total_cop?.toLocaleString()}</p>
              {comanda.total_ves > 0 && <p>Bs: {comanda.total_ves?.toLocaleString()}</p>}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-4 pt-3 border-t border-dashed border-black text-[10px] text-gray-600">
            <p>{configRestaurante.mensaje_footer}</p>
            <p className="mt-2">Impreso: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
          </div>
        </div>

        {/* Botones */}
        <div className="no-print flex justify-center gap-4 mt-6">
          <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
            <Printer className="w-4 h-4 mr-2" />
            IMPRIMIR COMANDA
          </Button>
          <Button onClick={handleClose} variant="outline">
            <X className="w-4 h-4 mr-2" />
            CERRAR
          </Button>
        </div>
      </div>
    </>
  );
}
