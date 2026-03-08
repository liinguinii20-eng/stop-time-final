import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Rocket, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function MigracionForzada({ onComplete }) {
  const [estado, setEstado] = useState('inicial'); // inicial, procesando, completado, error
  const [resultado, setResultado] = useState(null);
  const [log, setLog] = useState([]);

  const agregarLog = (mensaje) => {
    console.log(mensaje);
    setLog(prev => [...prev, mensaje]);
  };

  const ejecutarMigracionForzada = async () => {
    setEstado('procesando');
    setLog([]);
    setResultado(null);

    try {
      agregarLog("🚀 INICIANDO MIGRACIÓN FORZADA");

      // 1. Obtener todas las ventas en COP
      agregarLog("📥 Obteniendo ventas en pesos...");
      const ventas = await base44.entities.Venta.list('-created_date', 1000);
      const ventasCOP = ventas.filter(v => 
        v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop'
      );
      agregarLog(`✅ Encontradas ${ventasCOP.length} ventas en COP`);

      // 2. Obtener todos los gastos en COP
      agregarLog("📤 Obteniendo gastos en pesos...");
      const gastos = await base44.entities.Gasto.list('-created_date', 1000);
      const gastosCOP = gastos.filter(g => 
        g.metodo_pago === 'efectivo_cop' || g.metodo_pago === 'nequi_cop'
      );
      agregarLog(`✅ Encontrados ${gastosCOP.length} gastos en COP`);

      // 3. Obtener pagos mixtos en COP
      agregarLog("🔄 Obteniendo pagos mixtos en pesos...");
      const pagosMixtos = await base44.entities.PagoMixto.list('-created_date', 1000);
      const pagosMixtosCOP = pagosMixtos.filter(p => 
        p.metodo_pago === 'efectivo_cop' || p.metodo_pago === 'nequi_cop'
      );
      agregarLog(`✅ Encontrados ${pagosMixtosCOP.length} pagos mixtos en COP`);

      // 4. Procesar ventas COP
      let ventasActualizadas = 0;
      for (const venta of ventasCOP) {
        // Asegurar que tenga total_cop
        if (!venta.total_cop || venta.total_cop === 0) {
          const totalCOP = venta.total_venta * 4000;
          await base44.entities.Venta.update(venta.id, {
            total_cop: totalCOP
          });
          ventasActualizadas++;
          agregarLog(`✅ Venta ${venta.id.substring(0,8)}: COP calculado = ${totalCOP}`);
        }
      }

      // 5. Verificar conversión de valores
      let gastosConvertidos = 0;
      for (const gasto of gastosCOP) {
        // Si el monto parece estar en USD (< 1000), convertir
        if (gasto.monto < 1000) {
          const montoCOP = gasto.monto * 4000;
          agregarLog(`⚠️ Gasto ${gasto.id.substring(0,8)}: Detectado en USD (${gasto.monto}), convertir a COP (${montoCOP})?`);
          // NO actualizar automáticamente para evitar errores
          gastosConvertidos++;
        }
      }

      const resumenFinal = {
        ventas_cop: ventasCOP.length,
        gastos_cop: gastosCOP.length,
        pagos_mixtos_cop: pagosMixtosCOP.length,
        ventas_actualizadas: ventasActualizadas,
        gastos_requieren_revision: gastosConvertidos,
        total_transacciones: ventasCOP.length + gastosCOP.length + pagosMixtosCOP.length
      };

      setResultado(resumenFinal);
      setEstado('completado');
      agregarLog("✅ MIGRACIÓN COMPLETADA");
      
      toast.success(`Migración completada: ${resumenFinal.total_transacciones} transacciones en COP verificadas`);
      
      // Recargar después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("❌ Error en migración:", error);
      agregarLog(`❌ ERROR: ${error.message}`);
      setEstado('error');
      toast.error("Error en migración: " + error.message);
    }
  };

  return (
    <Card className="border-2 border-blue-500 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-blue-600" />
          Migración Forzada - Estado de Cuenta COP
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm text-amber-900 font-semibold mb-2">
            ⚠️ IMPORTANTE:
          </p>
          <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
            <li>Esta migración verificará todas las transacciones en pesos (COP)</li>
            <li>Calculará montos en COP para ventas que no los tengan</li>
            <li>Recargará automáticamente la página al finalizar</li>
          </ul>
        </div>

        <Button
          onClick={ejecutarMigracionForzada}
          disabled={estado === 'procesando'}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {estado === 'procesando' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Procesando Migración...
            </>
          ) : estado === 'completado' ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Migración Completada - Recargando...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2" />
              Ejecutar Migración Forzada
            </>
          )}
        </Button>

        {/* Log de proceso */}
        {log.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="font-mono text-xs space-y-1">
              {log.map((linea, idx) => (
                <div key={idx} className="text-green-400">
                  {linea}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className={`rounded-lg p-4 border-2 ${
            estado === 'completado' 
              ? 'bg-green-50 border-green-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              {estado === 'completado' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-900">Migración Exitosa</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-900">Problemas Detectados</span>
                </>
              )}
            </h3>

            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Ventas en COP:</span>
                  <span className="ml-2 font-bold text-blue-600">{resultado.ventas_cop}</span>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Gastos en COP:</span>
                  <span className="ml-2 font-bold text-red-600">{resultado.gastos_cop}</span>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Pagos mixtos COP:</span>
                  <span className="ml-2 font-bold text-purple-600">{resultado.pagos_mixtos_cop}</span>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Actualizadas:</span>
                  <span className="ml-2 font-bold text-green-600">{resultado.ventas_actualizadas}</span>
                </div>
              </div>

              {resultado.gastos_requieren_revision > 0 && (
                <div className="bg-yellow-100 rounded p-3 mt-2">
                  <p className="text-xs text-yellow-900">
                    ⚠️ {resultado.gastos_requieren_revision} gastos requieren revisión manual
                  </p>
                </div>
              )}

              <div className="bg-blue-100 rounded p-3 font-bold text-blue-900">
                Total transacciones en COP: {resultado.total_transacciones}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}