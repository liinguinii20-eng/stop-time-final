import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, X, ChefHat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function ComandaPrintView({ 
  isOpen, 
  onClose, 
  comanda, 
  detalles,
  tipo = "caja" // 'caja' o 'cocina'
}) {
  const printRef = useRef();

  const configRestaurante = {
    nombre: "STOP TIME SUSHI",
    mensaje_footer: "¡Gracias por su preferencia!"
  };

  if (!comanda) return null;

  // Total SIN IVA
  const total = detalles.reduce((sum, d) => sum + (d.subtotal || 0), 0);

  const fechaComanda = comanda.fecha_apertura 
    ? format(parseISO(comanda.fecha_apertura), "dd/MM/yyyy", { locale: es })
    : 'N/A';
  const horaComanda = comanda.fecha_apertura 
    ? format(parseISO(comanda.fecha_apertura), "HH:mm", { locale: es })
    : 'N/A';

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      // Si window.open está bloqueado, usar print directo
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda ${comanda.numero_comanda}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            max-width: 80mm;
            margin: 0 auto;
          }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h2 { font-size: 16px; margin-bottom: 5px; }
          .info { text-align: center; margin-bottom: 15px; }
          .info h3 { font-size: 14px; margin-bottom: 8px; }
          .info p { margin: 3px 0; }
          .items { margin: 10px 0; }
          .item { padding: 8px 0; border-bottom: 1px dotted #ccc; }
          .item-row { display: flex; justify-content: space-between; }
          .item-nota { font-size: 10px; color: #666; font-style: italic; margin-top: 3px; }
          .item-precio { font-size: 10px; color: #888; }
          .totales { border-top: 2px solid #000; margin-top: 15px; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total-final { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; border-top: 1px dashed #000; padding-top: 10px; }
          .cocina-header { text-align: center; font-size: 18px; font-weight: bold; }
          .cocina-item { font-size: 14px; font-weight: bold; padding: 10px 0; border-bottom: 1px dashed #ccc; }
          .cocina-nota { color: red; font-style: italic; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipo === 'cocina' ? <ChefHat className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
            {tipo === 'cocina' ? 'Imprimir para Cocina' : 'Imprimir Comanda'}
          </DialogTitle>
        </DialogHeader>

        {/* Vista previa */}
        <div className="border rounded-lg p-4 bg-white font-mono text-xs" ref={printRef}>
          {tipo === 'cocina' ? (
            // VISTA COCINA
            <>
              <div className="text-center border-b-2 border-black pb-3 mb-3">
                <div className="cocina-header">🍳 COCINA</div>
                <div className="text-lg font-bold mt-2">COMANDA #{comanda.numero_comanda}</div>
                <p className="mt-2">
                  <strong>Mesa:</strong> {comanda.mesa_numero} | <strong>Hora:</strong> {horaComanda}
                </p>
              </div>

              <div className="items">
                {detalles.map((detalle, idx) => (
                  <div key={idx} className="cocina-item">
                    <div>{detalle.cantidad}x {detalle.plato_nombre}</div>
                    {detalle.notas_plato && (
                      <div className="cocina-nota">⚠️ {detalle.notas_plato}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="footer">
                Impreso: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
            </>
          ) : (
            // VISTA CAJA
            <>
              <div className="header">
                <h2>{configRestaurante.nombre}</h2>
              </div>

              <div className="info">
                <h3>COMANDA #{comanda.numero_comanda}</h3>
                <p><strong>Mesa:</strong> {comanda.mesa_numero}</p>
                <p><strong>Mesero:</strong> {comanda.mesero_nombre}</p>
                <p><strong>Fecha:</strong> {fechaComanda}</p>
                <p><strong>Hora:</strong> {horaComanda}</p>
              </div>

              <div className="items">
                <div style={{borderBottom: '1px solid #000', marginBottom: '10px', paddingBottom: '5px'}}>
                  <strong>PEDIDO</strong>
                </div>
                
                {detalles.map((detalle, idx) => (
                  <div key={idx} className="item">
                    <div className="item-row">
                      <span><strong>{detalle.cantidad}x</strong> {detalle.plato_nombre}</span>
                      <span>${detalle.subtotal?.toFixed(2)}</span>
                    </div>
                    {detalle.notas_plato && (
                      <div className="item-nota">Nota: {detalle.notas_plato}</div>
                    )}
                    <div className="item-precio">${detalle.precio_unitario?.toFixed(2)} c/u</div>
                  </div>
                ))}
              </div>

              <div className="totales">
                <div className="total-row total-final">
                  <span>TOTAL A PAGAR:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {comanda.total_cop > 0 && (
                <div style={{marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #ccc', fontSize: '10px', color: '#666'}}>
                  <p>COP: ${comanda.total_cop?.toLocaleString()}</p>
                  {comanda.total_ves > 0 && <p>Bs: {comanda.total_ves?.toLocaleString()}</p>}
                </div>
              )}

              <div className="footer">
                <p>{configRestaurante.mensaje_footer}</p>
                <p style={{marginTop: '8px'}}>Impreso: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
            </>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-4">
          <Button onClick={onClose} variant="outline" className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <Button 
            onClick={handlePrint} 
            className={tipo === 'cocina' ? "flex-1 bg-amber-600 hover:bg-amber-700" : "flex-1 bg-green-600 hover:bg-green-700"}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}