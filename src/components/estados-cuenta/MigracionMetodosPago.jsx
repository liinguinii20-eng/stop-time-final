import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export default function MigracionMetodosPago({ onComplete }) {
  const [migrando, setMigrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const mapeoMetodos = {
    // Métodos antiguos -> nuevos
    "Efectivo": "efectivo_usd",
    "efectivo": "efectivo_usd",
    "Efectivo USD": "efectivo_usd",
    "Efectivo COP": "efectivo_cop",
    "efectivo_cop": "efectivo_cop",
    "Tarjeta": "tarjeta_bs",
    "tarjeta": "tarjeta_bs",
    "Transferencia": "binance_usd",
    "transferencia": "binance_usd",
    "Binance": "binance_usd",
    "Zinli": "zinli_usd",
    "PayPal": "paypal_usd",
    "Zelle": "zelle_usd",
    "Nequi": "nequi_cop",
    "nequi": "nequi_cop",
    "Pago Movil": "pago_movil_bs",
    "pago_movil": "pago_movil_bs",
    "Pago Móvil": "pago_movil_bs",
    "Mixto": "mixto",
    "mixto": "mixto"
  };

  const ejecutarMigracion = async () => {
    setMigrando(true);
    setResultado(null);

    try {
      console.log("🔄 Iniciando migración de métodos de pago...");
      
      let ventasActualizadas = 0;
      let gastosActualizados = 0;
      let comprasActualizadas = 0;

      // 1. Migrar VENTAS
      const ventas = await base44.entities.Venta.list('-created_date', 1000);
      console.log(`📦 Encontradas ${ventas.length} ventas`);
      
      for (const venta of ventas) {
        const metodoNormalizado = mapeoMetodos[venta.metodo_pago];
        if (metodoNormalizado && metodoNormalizado !== venta.metodo_pago) {
          await base44.entities.Venta.update(venta.id, {
            metodo_pago: metodoNormalizado
          });
          ventasActualizadas++;
          console.log(`✅ Venta ${venta.id} actualizada: ${venta.metodo_pago} → ${metodoNormalizado}`);
        }
      }

      // 2. Migrar GASTOS
      const gastos = await base44.entities.Gasto.list('-created_date', 1000);
      console.log(`💸 Encontrados ${gastos.length} gastos`);
      
      for (const gasto of gastos) {
        const metodoNormalizado = gasto.metodo_pago ? mapeoMetodos[gasto.metodo_pago] : null;
        if (metodoNormalizado && metodoNormalizado !== gasto.metodo_pago) {
          await base44.entities.Gasto.update(gasto.id, {
            metodo_pago: metodoNormalizado
          });
          gastosActualizados++;
          console.log(`✅ Gasto ${gasto.id} actualizado: ${gasto.metodo_pago} → ${metodoNormalizado}`);
        }
      }

      // 3. Migrar PAGOS MIXTOS
      let pagosMixtosActualizados = 0;
      try {
        const pagosMixtos = await base44.entities.PagoMixto.list('-created_date', 1000);
        console.log(`💳 Encontrados ${pagosMixtos.length} pagos mixtos`);
        
        for (const pago of pagosMixtos) {
          const metodoNormalizado = pago.metodo_pago ? mapeoMetodos[pago.metodo_pago] : null;
          if (metodoNormalizado && metodoNormalizado !== pago.metodo_pago) {
            await base44.entities.PagoMixto.update(pago.id, {
              metodo_pago: metodoNormalizado
            });
            pagosMixtosActualizados++;
            console.log(`✅ Pago mixto ${pago.id} actualizado: ${pago.metodo_pago} → ${metodoNormalizado}`);
          }
        }
      } catch (error) {
        console.log("ℹ️ Error al migrar pagos mixtos:", error.message);
      }

      // 4. Migrar COMPRAS (si existen)
      try {
        const compras = await base44.entities.Compra.list('-created_date', 1000);
        console.log(`🛒 Encontradas ${compras.length} compras`);
        
        for (const compra of compras) {
          const metodoNormalizado = compra.metodo_pago ? mapeoMetodos[compra.metodo_pago] : null;
          if (metodoNormalizado && metodoNormalizado !== compra.metodo_pago) {
            await base44.entities.Compra.update(compra.id, {
              metodo_pago: metodoNormalizado
            });
            comprasActualizadas++;
            console.log(`✅ Compra ${compra.id} actualizada`);
          }
        }
      } catch (error) {
        console.log("ℹ️ No se pudieron migrar compras (puede que no tengan método de pago)");
      }

      const resultado = {
        ventasActualizadas,
        gastosActualizados,
        pagosMixtosActualizados,
        comprasActualizadas,
        total: ventasActualizadas + gastosActualizados + pagosMixtosActualizados + comprasActualizadas
      };

      setResultado(resultado);
      toast.success(`✅ Migración completada: ${resultado.total} registros actualizados`);
      
      if (onComplete) {
        setTimeout(() => onComplete(), 2000);
      }

    } catch (error) {
      console.error("❌ Error en migración:", error);
      toast.error("Error al migrar datos: " + error.message);
      setResultado({ error: error.message });
    } finally {
      setMigrando(false);
    }
  };

  return (
    <Card className="shadow-lg border-2 border-blue-500">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-100 rounded-full">
            <RefreshCw className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              🔧 Migración de Métodos de Pago
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Este proceso actualizará automáticamente todos los métodos de pago antiguos 
              (Efectivo, Tarjeta, Transferencia) a los nuevos formatos (efectivo_usd, tarjeta_bs, etc.)
            </p>

            {!resultado && !migrando && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                <p className="text-xs text-amber-900">
                  <strong>⚠️ IMPORTANTE:</strong> Este proceso modificará tus datos existentes. 
                  Se recomienda hacer una copia de seguridad primero si tienes datos críticos.
                </p>
              </div>
            )}

            {resultado && !resultado.error && (
              <div className="bg-green-50 border border-green-200 rounded p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-900 font-bold">
                  <CheckCircle className="w-5 h-5" />
                  <span>¡Migración Exitosa!</span>
                </div>
                <div className="text-sm text-green-800 space-y-1">
                  <p>✅ Ventas actualizadas: <strong>{resultado.ventasActualizadas}</strong></p>
                  <p>✅ Gastos actualizados: <strong>{resultado.gastosActualizados}</strong></p>
                  <p>✅ Pagos mixtos actualizados: <strong>{resultado.pagosMixtosActualizados}</strong></p>
                  <p>✅ Compras actualizadas: <strong>{resultado.comprasActualizadas}</strong></p>
                  <p className="font-bold pt-2 border-t border-green-300">
                    Total: {resultado.total} registros migrados
                  </p>
                  <p className="text-xs mt-2 text-green-700">
                    Incluye: efectivo_cop, nequi_cop y todos los métodos en pesos
                  </p>
                </div>
              </div>
            )}

            {resultado?.error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center gap-2 text-red-900 font-bold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Error en Migración</span>
                </div>
                <p className="text-sm text-red-800">{resultado.error}</p>
              </div>
            )}

            <Button
              onClick={ejecutarMigracion}
              disabled={migrando || (resultado && !resultado.error)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {migrando ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Migrando datos...
                </>
              ) : resultado && !resultado.error ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Migración Completada
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Iniciar Migración Automática
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}