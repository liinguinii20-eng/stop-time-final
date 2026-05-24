import React, { useState } from 'react';
import { Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CierreTrimestral() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEjecutarCierre = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cierre-trimestral/ejecutar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al ejecutar el cierre trimestral');
      }

      // Obtener el archivo (blob)
      const blob = await response.blob();
      
      // Crear URL para descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cierre_Trimestral_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setIsSuccess(true);
      toast.success('Cierre trimestral ejecutado y Excel descargado correctamente.');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Hubo un problema al ejecutar el cierre');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-colors font-semibold"
      >
        <Download size={20} />
        Ejecutar Cierre Trimestral
      </button>

      {/* Modal de Confirmación */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            
            {!isSuccess ? (
              <>
                <div className="flex items-center gap-3 mb-4 text-red-600">
                  <AlertTriangle size={32} />
                  <h2 className="text-xl font-bold">¡Advertencia de Cierre!</h2>
                </div>
                
                <div className="space-y-4 mb-6 text-gray-600 dark:text-gray-300">
                  <p>
                    Estás a punto de ejecutar el <strong>Cierre Trimestral</strong>. Esta acción realizará lo siguiente:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Generará y descargará un archivo <strong>Excel estructurado</strong> con todo el historial.</li>
                    <li><strong>Eliminará irreversiblemente</strong> de la base de datos todas las comandas cerradas, ventas, adelantos y gastos procesados.</li>
                    <li>Limpiará las cuentas por cobrar que ya estén pagadas.</li>
                  </ul>
                  <p className="text-sm font-medium text-red-500">
                    Nota: Los productos, clientes y cuentas pendientes permanecerán intactos.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEjecutarCierre}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Procesando...
                      </>
                    ) : (
                      'Confirmar y Limpiar DB'
                    )}
                  </button>
                </div>
              </>
            ) : (
              // Mensaje de Éxito
              <div className="text-center py-6">
                <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">¡Cierre Exitoso!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  El historial transaccional ha sido depurado y el archivo Excel se ha descargado correctamente.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsSuccess(false);
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors w-full"
                >
                  Entendido
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </>
  );
}
