import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, AlertTriangle, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReparadorCOP() {
  const [estado, setEstado] = useState('inicial');
  const [resultado, setResultado] = useState(null);
  const [logs, setLogs] = useState([]);

  const log = (msg) => {
    console.log(msg);
    setLogs(prev => [...prev, msg]);
  };

  const reparar = async () => {
    setEstado('procesando');
    setLogs([]);
    
    try {
      log("🔧 INICIANDO REPARACIÓN DEFINITIVA COP");
      log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // ========== PASO 1: DIAGNÓSTICO INICIAL ==========
      log("📋 PASO 1: Diagnóstico inicial...");
      const ventas = await base44.entities.Venta.list('-created_date', 2000);
      const gastos = await base44.entities.Gasto.list('-created_date', 2000);
      log(`   Total ventas en sistema: ${ventas.length}`);
      log(`   Total gastos en sistema: ${gastos.length}`);
      
      // Listar TODOS los métodos únicos
      const metodosVentas = [...new Set(ventas.map(v => v.metodo_pago))];
      log(`   Métodos en ventas: ${metodosVentas.join(', ')}`);
      
      // ========== PASO 2: NORMALIZAR MÉTODOS ANTIGUOS ==========
      log("\n🔄 PASO 2: Normalizando métodos antiguos...");
      let ventasNormalizadas = 0;
      let gastosNormalizados = 0;
      
      const mapeoMetodos = {
        'Efectivo COP': 'efectivo_cop',
        'Nequi': 'nequi_cop',
        'nequi': 'nequi_cop'
      };
      
      for (const venta of ventas) {
        if (mapeoMetodos[venta.metodo_pago]) {
          await base44.entities.Venta.update(venta.id, { 
            metodo_pago: mapeoMetodos[venta.metodo_pago] 
          });
          log(`   ✅ V-${venta.id.substring(0,8)}: ${venta.metodo_pago} → ${mapeoMetodos[venta.metodo_pago]}`);
          ventasNormalizadas++;
        }
      }
      
      for (const gasto of gastos) {
        if (mapeoMetodos[gasto.metodo_pago]) {
          await base44.entities.Gasto.update(gasto.id, { 
            metodo_pago: mapeoMetodos[gasto.metodo_pago] 
          });
          log(`   ✅ G-${gasto.id.substring(0,8)}: ${gasto.metodo_pago} → ${mapeoMetodos[gasto.metodo_pago]}`);
          gastosNormalizados++;
        }
      }
      
      log(`   Normalizadas: ${ventasNormalizadas} ventas, ${gastosNormalizados} gastos`);
      
      // ========== PASO 3: RECALCULAR VALORES COP ==========
      log("\n💰 PASO 3: Recalculando valores en COP...");
      const ventasActualizadas = await base44.entities.Venta.list('-created_date', 2000);
      const ventasCOP = ventasActualizadas.filter(v => 
        v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop'
      );
      
      log(`   Ventas COP encontradas: ${ventasCOP.length}`);
      
      let ventasReparadas = 0;
      let valoresCorregidos = 0;
      
      for (const venta of ventasCOP) {
        const updates = {};
        
        // Caso 1: total_cop faltante
        if (!venta.total_cop || venta.total_cop === 0) {
          if (venta.total_venta > 1000) {
            // Probablemente está en COP
            updates.total_cop = venta.total_venta;
            updates.total_venta = venta.total_venta / 4000;
            valoresCorregidos++;
            log(`   🔧 V-${venta.id.substring(0,8)}: Valor en COP → USD: $${updates.total_venta.toFixed(2)}, COP: ₡${updates.total_cop}`);
          } else {
            updates.total_cop = venta.total_venta * 4000;
            log(`   📝 V-${venta.id.substring(0,8)}: Calculado COP: ₡${updates.total_cop}`);
          }
        }
        // Caso 2: total_venta muy alto (está en COP)
        else if (venta.total_venta > 100000) {
          updates.total_venta = venta.total_venta / 4000;
          updates.total_cop = venta.total_venta;
          valoresCorregidos++;
          log(`   🔧 V-${venta.id.substring(0,8)}: Corregido → USD: $${updates.total_venta.toFixed(2)}, COP: ₡${updates.total_cop}`);
        }
        
        if (Object.keys(updates).length > 0) {
          await base44.entities.Venta.update(venta.id, updates);
          ventasReparadas++;
        }
      }
      
      log(`   Reparadas: ${ventasReparadas} ventas, ${valoresCorregidos} valores corregidos`);
      
      // ========== PASO 4: VERIFICAR GASTOS ==========
      log("\n💸 PASO 4: Verificando gastos en COP...");
      const gastosActualizados = await base44.entities.Gasto.list('-created_date', 2000);
      const gastosCOP = gastosActualizados.filter(g => 
        g.metodo_pago === 'efectivo_cop' || g.metodo_pago === 'nequi_cop'
      );
      
      log(`   Gastos COP encontrados: ${gastosCOP.length}`);
      
      // ========== RESUMEN FINAL ==========
      log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      log("✅ REPARACIÓN COMPLETADA");
      log(`   Ventas COP: ${ventasCOP.length}`);
      log(`   Gastos COP: ${gastosCOP.length}`);
      log(`   Ventas reparadas: ${ventasReparadas}`);
      log(`   Valores corregidos: ${valoresCorregidos}`);
      log(`   Métodos normalizados: ${ventasNormalizadas + gastosNormalizados}`);
      
      setResultado({
        ventas_cop: ventasCOP.length,
        gastos_cop: gastosCOP.length,
        actualizadas: ventasReparadas,
        corregidas: valoresCorregidos,
        normalizadas: ventasNormalizadas + gastosNormalizados,
        exito: true
      });
      
      setEstado('completado');
      toast.success(`✅ Reparación completada - Recargando...`);
      
      setTimeout(() => window.location.href = createPageUrl('EstadosCuenta'), 1500);
      
    } catch (error) {
      log(`\n❌ ERROR: ${error.message}`);
      log(error.stack);
      setEstado('error');
      toast.error("Error: " + error.message);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl('EstadosCuenta')}>
            <Button variant="outline" size="sm" className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-600" />
            Reparador COP - Solución Definitiva
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Normaliza y repara todas las transacciones en pesos
          </p>
        </div>

        <Card className="border-2 border-orange-500">
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              ¿Qué hace esta herramienta?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Normaliza métodos antiguos (Efectivo COP → efectivo_cop)</li>
              <li>✅ Calcula total_cop faltante (total_venta × 4000)</li>
              <li>✅ Corrige valores incorrectos (si total_venta está en COP)</li>
              <li>✅ Recarga automáticamente al finalizar</li>
            </ul>
          </CardContent>
        </Card>

        <Button
          onClick={reparar}
          disabled={estado === 'procesando' || estado === 'completado'}
          className="w-full bg-orange-600 hover:bg-orange-700"
          size="lg"
        >
          {estado === 'procesando' ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Reparando...
            </>
          ) : estado === 'completado' ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Completado - Recargando...
            </>
          ) : (
            <>
              <Wrench className="w-5 h-5 mr-2" />
              Ejecutar Reparación
            </>
          )}
        </Button>

        {logs.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-900 rounded-b-lg p-4 max-h-96 overflow-y-auto">
                <div className="font-mono text-xs space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="text-green-400">{log}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resultado && (
          <Card className="border-2 border-green-500">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-blue-600">Ventas COP</p>
                  <p className="text-2xl font-bold text-blue-900">{resultado.ventas_cop}</p>
                </div>
                <div className="bg-purple-50 rounded p-3">
                  <p className="text-xs text-purple-600">Gastos COP</p>
                  <p className="text-2xl font-bold text-purple-900">{resultado.gastos_cop}</p>
                </div>
                <div className="bg-green-50 rounded p-3">
                  <p className="text-xs text-green-600">Actualizadas</p>
                  <p className="text-2xl font-bold text-green-900">{resultado.actualizadas}</p>
                </div>
                <div className="bg-orange-50 rounded p-3">
                  <p className="text-xs text-orange-600">Normalizadas</p>
                  <p className="text-2xl font-bold text-orange-900">{resultado.normalizadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
