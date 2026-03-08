import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Wrench, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DiagnosticoCompleto() {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [reparando, setReparando] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [reparacion, setReparacion] = useState(null);
  const [logs, setLogs] = useState([]);

  const agregarLog = (mensaje) => {
    console.log(mensaje);
    setLogs(prev => [...prev, mensaje]);
  };

  const ejecutarDiagnostico = async () => {
    setDiagnosticando(true);
    setLogs([]);
    setDiagnostico(null);

    try {
      agregarLog("🔍 INICIANDO DIAGNÓSTICO COMPLETO");

      // 1. Obtener TODAS las ventas
      agregarLog("📥 Obteniendo ventas...");
      const ventas = await base44.entities.Venta.list('-created_date', 1000);
      agregarLog(`✅ Total ventas: ${ventas.length}`);

      // 2. Filtrar ventas por método
      const ventasCOP = ventas.filter(v => v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop');
      const ventasVES = ventas.filter(v => v.metodo_pago === 'tarjeta_bs' || v.metodo_pago === 'pago_movil_bs');
      const ventasUSD = ventas.filter(v => 
        v.metodo_pago === 'efectivo_usd' || 
        v.metodo_pago === 'binance_usd' || 
        v.metodo_pago === 'zinli_usd' ||
        v.metodo_pago === 'paypal_usd' ||
        v.metodo_pago === 'zelle_usd'
      );

      agregarLog(`💰 Ventas COP: ${ventasCOP.length}`);
      agregarLog(`💰 Ventas VES: ${ventasVES.length}`);
      agregarLog(`💰 Ventas USD: ${ventasUSD.length}`);

      // 3. Verificar ventas COP sin total_cop
      const ventasCOPsinTotal = ventasCOP.filter(v => !v.total_cop || v.total_cop === 0);
      agregarLog(`⚠️ Ventas COP sin total_cop: ${ventasCOPsinTotal.length}`);

      // 4. Verificar ventas con valores incorrectos
      const ventasCOPconValorAlto = ventasCOP.filter(v => v.total_venta > 100000);
      agregarLog(`⚠️ Ventas COP con valor_usd muy alto (probablemente en COP): ${ventasCOPconValorAlto.length}`);

      // 5. Obtener gastos
      agregarLog("📤 Obteniendo gastos...");
      const gastos = await base44.entities.Gasto.list('-created_date', 1000);
      const gastosCOP = gastos.filter(g => g.metodo_pago === 'efectivo_cop' || g.metodo_pago === 'nequi_cop');
      agregarLog(`✅ Total gastos: ${gastos.length}`);
      agregarLog(`💸 Gastos COP: ${gastosCOP.length}`);

      // 6. Obtener pagos mixtos
      agregarLog("🔄 Obteniendo pagos mixtos...");
      const pagosMixtos = await base44.entities.PagoMixto.list('-created_date', 1000);
      const pagosMixtosCOP = pagosMixtos.filter(p => p.metodo_pago === 'efectivo_cop' || p.metodo_pago === 'nequi_cop');
      agregarLog(`✅ Total pagos mixtos: ${pagosMixtos.length}`);
      agregarLog(`💚 Pagos mixtos COP: ${pagosMixtosCOP.length}`);

      // 7. Detectar métodos antiguos
      const todosMetodos = [...new Set([
        ...ventas.map(v => v.metodo_pago),
        ...gastos.map(g => g.metodo_pago).filter(Boolean)
      ])];
      const metodosValidos = ['efectivo_usd', 'efectivo_cop', 'binance_usd', 'zinli_usd', 'paypal_usd', 
                             'zelle_usd', 'nequi_cop', 'tarjeta_bs', 'pago_movil_bs', 'mixto'];
      const metodosAntiguos = todosMetodos.filter(m => !metodosValidos.includes(m));
      
      if (metodosAntiguos.length > 0) {
        agregarLog(`⚠️ Métodos antiguos detectados: ${metodosAntiguos.join(', ')}`);
      }

      // 8. Resumen de problemas
      const problemas = [];
      if (ventasCOPsinTotal.length > 0) {
        problemas.push(`${ventasCOPsinTotal.length} ventas COP sin total_cop`);
      }
      if (ventasCOPconValorAlto.length > 0) {
        problemas.push(`${ventasCOPconValorAlto.length} ventas COP con valor incorrecto`);
      }
      if (metodosAntiguos.length > 0) {
        problemas.push(`Métodos antiguos: ${metodosAntiguos.join(', ')}`);
      }

      const resultado = {
        ventas_cop: ventasCOP.length,
        ventas_cop_sin_total: ventasCOPsinTotal.length,
        ventas_cop_valor_incorrecto: ventasCOPconValorAlto.length,
        ventas_ves: ventasVES.length,
        ventas_usd: ventasUSD.length,
        gastos_cop: gastosCOP.length,
        pagos_mixtos_cop: pagosMixtosCOP.length,
        metodos_antiguos: metodosAntiguos,
        necesita_reparacion: problemas.length > 0,
        problemas: problemas,
        detalles_cop: ventasCOP.slice(0, 10).map(v => ({
          id: v.id.substring(0, 8),
          metodo: v.metodo_pago,
          total_venta: v.total_venta,
          total_cop: v.total_cop,
          fecha: v.fecha_hora
        }))
      };

      setDiagnostico(resultado);
      agregarLog("✅ DIAGNÓSTICO COMPLETADO");

      if (resultado.necesita_reparacion) {
        toast.warning(`⚠️ ${problemas.length} problema(s) detectado(s)`);
      } else {
        toast.success("✅ Sistema OK - No se detectaron problemas");
      }

    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      agregarLog(`❌ ERROR: ${error.message}`);
      toast.error("Error en diagnóstico: " + error.message);
    } finally {
      setDiagnosticando(false);
    }
  };

  const ejecutarReparacion = async () => {
    setReparando(true);
    setLogs([]);
    setReparacion(null);

    try {
      agregarLog("🔧 INICIANDO REPARACIÓN AUTOMÁTICA");

      let ventasActualizadas = 0;
      let gastosActualizados = 0;
      let pagosMixtosActualizados = 0;

      // 1. Reparar ventas COP sin total_cop
      agregarLog("📝 Calculando total_cop faltantes...");
      const ventas = await base44.entities.Venta.list('-created_date', 1000);
      const ventasCOP = ventas.filter(v => v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop');

      for (const venta of ventasCOP) {
        if (!venta.total_cop || venta.total_cop === 0) {
          await base44.entities.Venta.update(venta.id, {
            total_cop: venta.total_venta * 4000
          });
          ventasActualizadas++;
          agregarLog(`✅ Venta ${venta.id.substring(0,8)}: total_cop = ${venta.total_venta * 4000}`);
        }
      }

      // 2. Corregir ventas con valor_usd incorrecto
      agregarLog("🔄 Corrigiendo valores incorrectos...");
      for (const venta of ventasCOP) {
        if (venta.total_venta > 100000) {
          const totalUSD = venta.total_venta / 4000;
          const totalCOP = venta.total_venta;
          
          await base44.entities.Venta.update(venta.id, {
            total_venta: totalUSD,
            total_cop: totalCOP
          });
          ventasActualizadas++;
          agregarLog(`✅ Venta ${venta.id.substring(0,8)}: corregida USD=${totalUSD} COP=${totalCOP}`);
        }
      }

      // 3. Normalizar métodos antiguos
      agregarLog("🔄 Normalizando métodos de pago...");
      const mapeoMetodos = {
        'Efectivo COP': 'efectivo_cop',
        'Nequi': 'nequi_cop',
        'nequi': 'nequi_cop',
        'Efectivo': 'efectivo_usd',
        'efectivo': 'efectivo_usd'
      };

      const todasVentas = await base44.entities.Venta.list('-created_date', 1000);
      for (const venta of todasVentas) {
        if (mapeoMetodos[venta.metodo_pago]) {
          await base44.entities.Venta.update(venta.id, {
            metodo_pago: mapeoMetodos[venta.metodo_pago]
          });
          ventasActualizadas++;
          agregarLog(`✅ Venta ${venta.id.substring(0,8)}: ${venta.metodo_pago} → ${mapeoMetodos[venta.metodo_pago]}`);
        }
      }

      const todosGastos = await base44.entities.Gasto.list('-created_date', 1000);
      for (const gasto of todosGastos) {
        if (mapeoMetodos[gasto.metodo_pago]) {
          await base44.entities.Gasto.update(gasto.id, {
            metodo_pago: mapeoMetodos[gasto.metodo_pago]
          });
          gastosActualizados++;
          agregarLog(`✅ Gasto ${gasto.id.substring(0,8)}: normalizado`);
        }
      }

      const todosPagos = await base44.entities.PagoMixto.list('-created_date', 1000);
      for (const pago of todosPagos) {
        if (mapeoMetodos[pago.metodo_pago]) {
          await base44.entities.PagoMixto.update(pago.id, {
            metodo_pago: mapeoMetodos[pago.metodo_pago]
          });
          pagosMixtosActualizados++;
          agregarLog(`✅ Pago mixto ${pago.id.substring(0,8)}: normalizado`);
        }
      }

      const resultado = {
        ventas_actualizadas: ventasActualizadas,
        gastos_actualizados: gastosActualizados,
        pagos_mixtos_actualizados: pagosMixtosActualizados,
        total: ventasActualizadas + gastosActualizados + pagosMixtosActualizados
      };

      setReparacion(resultado);
      agregarLog(`✅ REPARACIÓN COMPLETADA: ${resultado.total} registros actualizados`);
      
      toast.success(`✅ Reparación completada: ${resultado.total} registros actualizados`);

      // Recargar después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("❌ Error en reparación:", error);
      agregarLog(`❌ ERROR: ${error.message}`);
      toast.error("Error en reparación: " + error.message);
    } finally {
      setReparando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link to={createPageUrl('EstadosCuenta')}>
            <Button variant="outline" size="sm" className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            Diagnóstico Completo - Estado de Cuenta
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Verifica y repara automáticamente problemas en transacciones COP
          </p>
        </div>

        {/* Botones de acción */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={ejecutarDiagnostico}
                disabled={diagnosticando || reparando}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {diagnosticando ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Diagnosticando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Ejecutar Diagnóstico
                  </>
                )}
              </Button>

              <Button
                onClick={ejecutarReparacion}
                disabled={reparando || diagnosticando || !diagnostico?.necesita_reparacion}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {reparando ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Reparando...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 mr-2" />
                    Ejecutar Reparación
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs en tiempo real */}
        {logs.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm">📋 Log de Proceso</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-gray-900 rounded-b-lg p-4 max-h-96 overflow-y-auto">
                <div className="font-mono text-xs space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="text-green-400">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultados del diagnóstico */}
        {diagnostico && (
          <Card className={`shadow-lg border-2 ${
            diagnostico.necesita_reparacion ? 'border-red-500' : 'border-green-500'
          }`}>
            <CardHeader className={`${
              diagnostico.necesita_reparacion ? 'bg-red-50' : 'bg-green-50'
            }`}>
              <CardTitle className="flex items-center gap-2">
                {diagnostico.necesita_reparacion ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-900">Problemas Detectados</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-900">Sistema OK</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Ventas COP</p>
                  <p className="text-2xl font-bold text-blue-900">{diagnostico.ventas_cop}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-600 mb-1">Gastos COP</p>
                  <p className="text-2xl font-bold text-green-900">{diagnostico.gastos_cop}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">Pagos Mixtos COP</p>
                  <p className="text-2xl font-bold text-purple-900">{diagnostico.pagos_mixtos_cop}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-amber-600 mb-1">Total COP</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {diagnostico.ventas_cop + diagnostico.gastos_cop + diagnostico.pagos_mixtos_cop}
                  </p>
                </div>
              </div>

              {/* Problemas */}
              {diagnostico.necesita_reparacion && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                  <h3 className="font-bold text-red-900 mb-2">⚠️ Problemas Detectados:</h3>
                  <ul className="space-y-1 text-sm text-red-800">
                    {diagnostico.problemas.map((problema, idx) => (
                      <li key={idx}>• {problema}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detalles */}
              {diagnostico.detalles_cop.length > 0 && (
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="font-semibold cursor-pointer text-gray-900">
                    Ver detalles de ventas COP (primeras 10)
                  </summary>
                  <div className="mt-3 space-y-2 text-xs">
                    {diagnostico.detalles_cop.map(v => (
                      <div key={v.id} className="bg-white rounded p-2 border">
                        <span className="font-mono">{v.id}</span> - 
                        <span className="ml-2">{v.metodo}</span> - 
                        <span className="ml-2">USD: ${v.total_venta}</span> - 
                        <span className="ml-2">COP: ₡{v.total_cop || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultados de reparación */}
        {reparacion && (
          <Card className="shadow-lg border-2 border-green-500">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-900">Reparación Completada</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2 text-sm text-green-800">
                <p>✅ Ventas actualizadas: <strong>{reparacion.ventas_actualizadas}</strong></p>
                <p>✅ Gastos actualizados: <strong>{reparacion.gastos_actualizados}</strong></p>
                <p>✅ Pagos mixtos actualizados: <strong>{reparacion.pagos_mixtos_actualizados}</strong></p>
                <p className="font-bold pt-2 border-t border-green-300 text-lg">
                  Total: {reparacion.total} registros actualizados
                </p>
                <p className="text-xs mt-3 text-green-700">
                  ⏳ Recargando página en 2 segundos...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
