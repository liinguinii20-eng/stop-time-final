import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HerramientaManual() {
  const [diagnostico, setDiagnostico] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  // Form para crear movimiento
  const [metodo, setMetodo] = useState('efectivo_cop');
  const [tipo, setTipo] = useState('ENTRADA');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');

  const verDatosReales = async () => {
    setCargando(true);
    try {
      console.log("🔍 Verificando datos reales...");

      const ventas = await base44.entities.Venta.list('-created_date', 1000);
      const ventasCOP = ventas.filter(v => v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop');

      const gastos = await base44.entities.Gasto.list('-created_date', 1000);
      const gastosCOP = gastos.filter(g => g.metodo_pago === 'efectivo_cop' || g.metodo_pago === 'nequi_cop');

      console.log(`✅ Ventas COP: ${ventasCOP.length}`);
      console.log(`✅ Gastos COP: ${gastosCOP.length}`);

      setDiagnostico({
        ventas: ventasCOP.slice(0, 10).map(v => ({
          id: v.id.substring(0, 8),
          metodo: v.metodo_pago,
          monto: v.total_venta,
          fecha: v.fecha_hora,
          comanda: v.comanda_id || 'N/A'
        })),
        gastos: gastosCOP.slice(0, 10).map(g => ({
          id: g.id.substring(0, 8),
          metodo: g.metodo_pago,
          monto: g.monto,
          fecha: g.fecha_gasto,
          descripcion: g.descripcion
        })),
        totales: {
          ventas: ventasCOP.length,
          gastos: gastosCOP.length
        }
      });

      toast.success("Diagnóstico completado");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const crearMovimientoManual = async () => {
    if (!concepto || !monto) {
      toast.error("Completa concepto y monto");
      return;
    }

    setCargando(true);
    try {
      const montoNum = parseFloat(monto);
      
      console.log(`🛠️ Creando movimiento: ${tipo} ${metodo} $${montoNum}`);

      // Nota: Aquí intentamos crear directamente el movimiento
      // pero base44 no tiene entidad estado_cuenta_metodos disponible públicamente
      // La solución real es que las ventas/gastos se reflejen correctamente
      
      toast.info("Esta función requiere acceso a backend - usa DiagnosticoCompleto");
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl('EstadosCuenta')}>
            <Button variant="outline" size="sm" className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-600" />
            Herramienta Manual - Verificación Simple
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ver datos reales y diagnóstico básico
          </p>
        </div>

        {/* Botón diagnóstico */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <Button
              onClick={verDatosReales}
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {cargando ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Ver Datos Reales
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {diagnostico && (
          <>
            {/* Resumen */}
            <Card className="shadow-lg border-2 border-blue-500">
              <CardHeader className="bg-blue-50">
                <CardTitle>📊 Resumen</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-600 mb-1">Ventas en COP</p>
                    <p className="text-3xl font-bold text-green-900">{diagnostico.totales.ventas}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-600 mb-1">Gastos en COP</p>
                    <p className="text-3xl font-bold text-red-900">{diagnostico.totales.gastos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ventas */}
            <Card className="shadow-lg">
              <CardHeader className="bg-green-50">
                <CardTitle>💰 Ventas en COP (primeras 10)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {diagnostico.ventas.map(v => (
                    <div key={v.id} className="bg-white border rounded-lg p-3 flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-mono text-sm">{v.id}</p>
                        <p className="text-xs text-gray-500">{v.metodo} - Comanda #{v.comanda}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${v.monto}</p>
                        <p className="text-xs text-gray-500">{new Date(v.fecha).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gastos */}
            <Card className="shadow-lg">
              <CardHeader className="bg-red-50">
                <CardTitle>💸 Gastos en COP (primeros 10)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {diagnostico.gastos.map(g => (
                    <div key={g.id} className="bg-white border rounded-lg p-3 flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-mono text-sm">{g.id}</p>
                        <p className="text-sm text-gray-700">{g.descripcion}</p>
                        <p className="text-xs text-gray-500">{g.metodo}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">${g.monto}</p>
                        <p className="text-xs text-gray-500">{new Date(g.fecha).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Instrucciones */}
        <Card className="shadow-lg border-2 border-amber-500">
          <CardHeader className="bg-amber-50">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-600" />
              ¿Qué hacer si las ventas no aparecen?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-amber-900">Si ves ventas aquí pero NO en "Estado de Cuenta":</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Ve a <strong>Diagnóstico Completo</strong> desde la página de Estado de Cuenta</li>
                <li>Haz clic en <strong>"Ejecutar Diagnóstico"</strong></li>
                <li>Si detecta problemas, haz clic en <strong>"Ejecutar Reparación"</strong></li>
                <li>El sistema recalculará automáticamente todos los valores</li>
                <li>La página se recargará y deberías ver las transacciones</li>
              </ol>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                <p className="text-xs text-blue-900 font-semibold mb-2">💡 CAUSA DEL PROBLEMA:</p>
                <p className="text-xs text-blue-800">
                  Las ventas en COP existen en la base de datos, pero pueden tener:
                </p>
                <ul className="text-xs text-blue-800 list-disc list-inside mt-1 space-y-1">
                  <li>Campo <code>total_cop</code> vacío o en cero</li>
                  <li>Campo <code>total_venta</code> con valor en COP en lugar de USD</li>
                  <li>Método de pago con formato antiguo</li>
                </ul>
              </div>

              <Link to={createPageUrl('DiagnosticoCompleto')}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                  🔍 Ir a Diagnóstico Completo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ); 
}