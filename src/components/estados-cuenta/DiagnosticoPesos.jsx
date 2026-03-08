import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, Search, Wrench } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoPesos({ onComplete }) {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [reparando, setReparando] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [reparacion, setReparacion] = useState(null);

  const ejecutarDiagnostico = async () => {
    setDiagnosticando(true);
    setDiagnostico(null);
    
    try {
      console.log("🔍 INICIANDO DIAGNÓSTICO ESPECÍFICO PARA PESOS");
      
      // 1. Obtener todas las ventas
      const todasVentas = await base44.entities.Venta.list('-created_date', 1000);
      console.log(`📦 Total ventas en sistema: ${todasVentas.length}`);
      
      // 2. Filtrar ventas en pesos
      const ventasPesos = todasVentas.filter(v => 
        v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop'
      );
      console.log(`💰 Ventas en PESOS: ${ventasPesos.length}`);
      ventasPesos.forEach(v => {
        console.log(`   - V-${v.id}: ${v.metodo_pago} - USD:${v.total_venta} COP:${v.total_cop}`);
      });
      
      // 3. Obtener todos los gastos
      const todosGastos = await base44.entities.Gasto.list('-created_date', 1000);
      console.log(`💸 Total gastos en sistema: ${todosGastos.length}`);
      
      // 4. Filtrar gastos en pesos
      const gastosPesos = todosGastos.filter(g => 
        g.metodo_pago === 'efectivo_cop' || g.metodo_pago === 'nequi_cop'
      );
      console.log(`💸 Gastos en PESOS: ${gastosPesos.length}`);
      gastosPesos.forEach(g => {
        console.log(`   - G-${g.id}: ${g.metodo_pago} - $${g.monto}`);
      });
      
      // 5. Obtener pagos mixtos
      const todosPagosMixtos = await base44.entities.PagoMixto.list('-created_date', 1000);
      const pagosMixtosPesos = todosPagosMixtos.filter(p => 
        p.metodo_pago === 'efectivo_cop' || p.metodo_pago === 'nequi_cop'
      );
      console.log(`🔄 Pagos mixtos en PESOS: ${pagosMixtosPesos.length}`);
      
      // 6. Verificar métodos antiguos que deberían ser pesos
      const metodosAntiguosPesos = ['Efectivo COP', 'efectivo_cop', 'Nequi', 'nequi'];
      const ventasAntiguasPesos = todasVentas.filter(v => 
        metodosAntiguosPesos.includes(v.metodo_pago)
      );
      const gastosAntiguosPesos = todosGastos.filter(g => 
        metodosAntiguosPesos.includes(g.metodo_pago)
      );
      const pagosMixtosAntiguosPesos = todosPagosMixtos.filter(p => 
        metodosAntiguosPesos.includes(p.metodo_pago)
      );
      
      // 7. Verificar si las ventas en COP tienen total_cop
      const ventasSinTotalCOP = ventasPesos.filter(v => !v.total_cop || v.total_cop === 0);
      
      const resultado = {
        ventas_pesos_correctas: ventasPesos.length,
        gastos_pesos_correctos: gastosPesos.length,
        pagos_mixtos_pesos_correctos: pagosMixtosPesos.length,
        ventas_antiguos: ventasAntiguasPesos.length,
        gastos_antiguos: gastosAntiguosPesos.length,
        pagos_mixtos_antiguos: pagosMixtosAntiguosPesos.length,
        ventas_sin_total_cop: ventasSinTotalCOP.length,
        necesita_reparacion: ventasAntiguasPesos.length > 0 || 
                            gastosAntiguosPesos.length > 0 || 
                            pagosMixtosAntiguosPesos.length > 0 ||
                            ventasSinTotalCOP.length > 0,
        detalles: {
          ventas_pesos: ventasPesos.slice(0, 10).map(v => ({
            id: v.id,
            metodo: v.metodo_pago,
            total_usd: v.total_venta,
            total_cop: v.total_cop,
            fecha: v.fecha_hora
          })),
          gastos_pesos: gastosPesos.slice(0, 10).map(g => ({
            id: g.id,
            metodo: g.metodo_pago,
            monto: g.monto,
            descripcion: g.descripcion,
            fecha: g.fecha_gasto
          }))
        }
      };
      
      setDiagnostico(resultado);
      console.log("✅ Diagnóstico completado:", resultado);
      
      if (!resultado.necesita_reparacion) {
        toast.success("✅ Sistema OK - No se detectaron problemas en pesos");
      } else {
        toast.warning("⚠️ Se detectaron problemas - Ejecutar reparación");
      }
      
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      toast.error("Error al ejecutar diagnóstico: " + error.message);
    } finally {
      setDiagnosticando(false);
    }
  };

  const ejecutarReparacion = async () => {
    setReparando(true);
    setReparacion(null);
    
    try {
      console.log("🔧 INICIANDO REPARACIÓN DE MÉTODOS EN PESOS");
      
      let ventasReparadas = 0;
      let gastosReparados = 0;
      let pagosMixtosReparados = 0;
      let ventasCOPActualizadas = 0;
      
      // 1. Reparar ventas con métodos antiguos
      const todasVentas = await base44.entities.Venta.list('-created_date', 1000);
      const metodosAntiguosPesos = ['Efectivo COP', 'Nequi', 'nequi'];
      
      for (const venta of todasVentas) {
        let actualizar = false;
        let nuevosDatos = {};
        
        // Normalizar método de pago
        if (metodosAntiguosPesos.includes(venta.metodo_pago)) {
          if (venta.metodo_pago === 'Efectivo COP') {
            nuevosDatos.metodo_pago = 'efectivo_cop';
          } else if (venta.metodo_pago === 'Nequi' || venta.metodo_pago === 'nequi') {
            nuevosDatos.metodo_pago = 'nequi_cop';
          }
          actualizar = true;
        }
        
        // Calcular total_cop si no existe
        if ((venta.metodo_pago === 'efectivo_cop' || venta.metodo_pago === 'nequi_cop' || nuevosDatos.metodo_pago === 'efectivo_cop' || nuevosDatos.metodo_pago === 'nequi_cop') && (!venta.total_cop || venta.total_cop === 0)) {
          nuevosDatos.total_cop = venta.total_venta * 4000;
          actualizar = true;
          ventasCOPActualizadas++;
        }
        
        if (actualizar) {
          await base44.entities.Venta.update(venta.id, nuevosDatos);
          ventasReparadas++;
          console.log(`✅ Venta ${venta.id} reparada:`, nuevosDatos);
        }
      }
      
      // 2. Reparar gastos con métodos antiguos
      const todosGastos = await base44.entities.Gasto.list('-created_date', 1000);
      
      for (const gasto of todosGastos) {
        if (metodosAntiguosPesos.includes(gasto.metodo_pago)) {
          let nuevoMetodo = null;
          
          if (gasto.metodo_pago === 'Efectivo COP') {
            nuevoMetodo = 'efectivo_cop';
          } else if (gasto.metodo_pago === 'Nequi' || gasto.metodo_pago === 'nequi') {
            nuevoMetodo = 'nequi_cop';
          }
          
          if (nuevoMetodo) {
            await base44.entities.Gasto.update(gasto.id, {
              metodo_pago: nuevoMetodo
            });
            gastosReparados++;
            console.log(`✅ Gasto ${gasto.id} reparado: ${gasto.metodo_pago} → ${nuevoMetodo}`);
          }
        }
      }
      
      // 3. Reparar pagos mixtos
      const todosPagosMixtos = await base44.entities.PagoMixto.list('-created_date', 1000);
      
      for (const pago of todosPagosMixtos) {
        if (metodosAntiguosPesos.includes(pago.metodo_pago)) {
          let nuevoMetodo = null;
          
          if (pago.metodo_pago === 'Efectivo COP') {
            nuevoMetodo = 'efectivo_cop';
          } else if (pago.metodo_pago === 'Nequi' || pago.metodo_pago === 'nequi') {
            nuevoMetodo = 'nequi_cop';
          }
          
          if (nuevoMetodo) {
            await base44.entities.PagoMixto.update(pago.id, {
              metodo_pago: nuevoMetodo
            });
            pagosMixtosReparados++;
            console.log(`✅ Pago mixto ${pago.id} reparado`);
          }
        }
      }
      
      console.log("🔧 VERIFICANDO Y REPARANDO INCONSISTENCIAS EN VENTAS COP");
      
      // 4. CRÍTICO: Verificar ventas en COP que tienen monto incorrecto
      const ventasCOPActuales = await base44.entities.Venta.list('-created_date', 1000);
      let ventasValorCorregido = 0;
      
      for (const venta of ventasCOPActuales) {
        if (venta.metodo_pago === 'efectivo_cop' || venta.metodo_pago === 'nequi_cop') {
          // Verificar si el total_venta es muy alto (probablemente está en COP en lugar de USD)
          if (venta.total_venta > 100000) {
            // Probablemente el valor está en COP, convertir a USD
            const totalUSD = venta.total_venta / 4000;
            const totalCOP = venta.total_venta;
            
            await base44.entities.Venta.update(venta.id, {
              total_venta: totalUSD,
              total_cop: totalCOP
            });
            
            ventasValorCorregido++;
            console.log(`✅ Venta ${venta.id} corregida: COP ${totalCOP} → USD ${totalUSD}`);
          }
        }
      }
      
      const resultado = {
        ventas_reparadas: ventasReparadas,
        gastos_reparados: gastosReparados,
        pagos_mixtos_reparados: pagosMixtosReparados,
        ventas_cop_actualizadas: ventasCOPActualizadas,
        ventas_valor_corregido: ventasValorCorregido,
        total: ventasReparadas + gastosReparados + pagosMixtosReparados + ventasValorCorregido
      };
      
      setReparacion(resultado);
      console.log("✅ Reparación completada:", resultado);
      
      toast.success(`✅ Reparación completada: ${resultado.total} registros actualizados - Recargando...`);
      
      // Recargar la página para ver los cambios
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("❌ Error en reparación:", error);
      toast.error("Error al ejecutar reparación: " + error.message);
    } finally {
      setReparando(false);
    }
  };

  return (
    <Card className="border-2 border-purple-500 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-purple-600" />
          Diagnóstico y Reparación - Métodos en Pesos (COP)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button
            onClick={ejecutarDiagnostico}
            disabled={diagnosticando || reparando}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {diagnosticando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Diagnosticando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Diagnosticar Sistema
              </>
            )}
          </Button>
          
          <Button
            onClick={ejecutarReparacion}
            disabled={reparando || diagnosticando}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {reparando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reparando...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Ejecutar Reparación
              </>
            )}
          </Button>
        </div>

        {/* Resultados del Diagnóstico */}
        {diagnostico && (
          <div className={`rounded-lg p-4 border-2 ${
            diagnostico.necesita_reparacion 
              ? 'bg-red-50 border-red-300' 
              : 'bg-green-50 border-green-300'
          }`}>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              {diagnostico.necesita_reparacion ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-900">Problemas Detectados</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-900">Sistema OK</span>
                </>
              )}
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Ventas en pesos correctas:</span>
                  <span className="ml-2 font-bold text-green-600">{diagnostico.ventas_pesos_correctas}</span>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Gastos en pesos correctos:</span>
                  <span className="ml-2 font-bold text-green-600">{diagnostico.gastos_pesos_correctos}</span>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Pagos mixtos en pesos:</span>
                  <span className="ml-2 font-bold text-blue-600">{diagnostico.pagos_mixtos_pesos_correctos}</span>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-gray-600">Ventas sin total_cop:</span>
                  <span className="ml-2 font-bold text-red-600">{diagnostico.ventas_sin_total_cop}</span>
                </div>
              </div>
              
              {diagnostico.necesita_reparacion && (
                <div className="bg-yellow-100 rounded p-3 mt-3">
                  <p className="font-semibold text-yellow-900 mb-2">⚠️ Necesita Corrección:</p>
                  <ul className="text-xs space-y-1 text-yellow-800">
                    {diagnostico.ventas_antiguos > 0 && (
                      <li>• {diagnostico.ventas_antiguos} ventas con métodos antiguos</li>
                    )}
                    {diagnostico.gastos_antiguos > 0 && (
                      <li>• {diagnostico.gastos_antiguos} gastos con métodos antiguos</li>
                    )}
                    {diagnostico.pagos_mixtos_antiguos > 0 && (
                      <li>• {diagnostico.pagos_mixtos_antiguos} pagos mixtos con métodos antiguos</li>
                    )}
                    {diagnostico.ventas_sin_total_cop > 0 && (
                      <li>• {diagnostico.ventas_sin_total_cop} ventas sin total_cop calculado</li>
                    )}
                  </ul>
                </div>
              )}
              
              {diagnostico.detalles.ventas_pesos.length > 0 && (
                <details className="bg-white rounded p-2 mt-2">
                  <summary className="font-semibold cursor-pointer">Ver detalles de ventas en pesos</summary>
                  <div className="mt-2 space-y-1 text-xs">
                    {diagnostico.detalles.ventas_pesos.map(v => (
                      <div key={v.id} className="border-b pb-1">
                        <span className="font-mono">{v.id.substring(0, 8)}</span> - 
                        <span className="ml-2">{v.metodo}</span> - 
                        <span className="ml-2">USD: ${v.total_usd}</span> - 
                        <span className="ml-2">COP: ₡{v.total_cop || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Resultados de la Reparación */}
        {reparacion && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Reparación Completada
            </h3>
            <div className="space-y-2 text-sm text-green-800">
              <p>✅ Ventas reparadas: <strong>{reparacion.ventas_reparadas}</strong></p>
              <p>✅ Gastos reparados: <strong>{reparacion.gastos_reparados}</strong></p>
              <p>✅ Pagos mixtos reparados: <strong>{reparacion.pagos_mixtos_reparados}</strong></p>
              <p>✅ Ventas con COP calculado: <strong>{reparacion.ventas_cop_actualizadas}</strong></p>
              <p>✅ Ventas con valor corregido: <strong>{reparacion.ventas_valor_corregido || 0}</strong></p>
              <p className="font-bold pt-2 border-t border-green-300">
                Total registros actualizados: {reparacion.total}
              </p>
              <p className="text-xs mt-2 text-green-700">
                ⚠️ IMPORTANTE: Después de la reparación, recarga la página para ver los cambios en el estado de cuenta
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
          <p className="font-semibold mb-2">📋 Instrucciones:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Haz clic en "Diagnosticar Sistema" para escanear problemas</li>
            <li>Si se detectan problemas, haz clic en "Ejecutar Reparación"</li>
            <li>La reparación normalizará métodos antiguos y calculará montos en COP</li>
            <li>Después de la reparación, recarga la página para ver los cambios</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}