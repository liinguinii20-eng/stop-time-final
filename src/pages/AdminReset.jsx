import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  AlertTriangle, 
  Database, 
  RefreshCcw, 
  ShieldAlert,
  Server
} from "lucide-react";
import { toast } from "sonner";

export default function AdminReset() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const queryClient = useQueryClient();

  // Stats Queries
  const { data: ventas = [] } = useQuery({ queryKey: ['ventas-count'], queryFn: () => base44.entities.Venta.list() });
  const { data: comandas = [] } = useQuery({ queryKey: ['comandas-count'], queryFn: () => base44.entities.Comanda.list() });
  const { data: gastos = [] } = useQuery({ queryKey: ['gastos-count'], queryFn: () => base44.entities.Gasto.list() });
  const { data: cuentasPorCobrar = [] } = useQuery({ queryKey: ['cuentas-count'], queryFn: () => base44.entities.CuentaPorCobrar.list() });
  const { data: empleados = [] } = useQuery({ queryKey: ['empleados-count'], queryFn: () => base44.entities.Empleado.list() });
  const { data: platos = [] } = useQuery({ queryKey: ['platos-count'], queryFn: () => base44.entities.Plato.list() });
  const { data: ingredientes = [] } = useQuery({ queryKey: ['ingredientes-count'], queryFn: () => base44.entities.Ingrediente.list() });

  const addLog = (message) => setLogs(prev => [...prev, message]);

  const limpiezaTotal = async () => {
    if (!window.confirm("🚨 ¿ESTÁS ABSOLUTAMENTE SEGURO?\n\nEsta acción eliminará TODAS las ventas, comandas, gastos e historial.\nNO SE PUEDE DESHACER.")) return;
    
    setIsCleaning(true);
    setProgress(0);
    setLogs([]);
    addLog("🚀 Iniciando limpieza del sistema...");

    try {
      // Helper to delete in batches
      const deleteBatch = async (entityName, items) => {
        addLog(`🗑️ Eliminando ${items.length} registros de ${entityName}...`);
        let deleted = 0;
        for (const item of items) {
          await base44.entities[entityName].delete(item.id);
          deleted++;
        }
        return deleted;
      };

      // 1. Pagos Mixtos y Detalles de Venta (Dependencias de Venta)
      const pagosMixtos = await base44.entities.PagoMixto.list();
      await deleteBatch("PagoMixto", pagosMixtos);
      
      const detallesVenta = await base44.entities.DetalleVenta.list();
      await deleteBatch("DetalleVenta", detallesVenta);

      // 2. Ventas
      const ventasList = await base44.entities.Venta.list();
      await deleteBatch("Venta", ventasList);
      addLog("✅ Ventas y pagos eliminados");
      setProgress(20);

      // 3. Detalles Comanda (Dependencia de Comanda)
      const detallesComanda = await base44.entities.DetalleComanda.list();
      await deleteBatch("DetalleComanda", detallesComanda);

      // 4. Comandas
      const comandasList = await base44.entities.Comanda.list();
      await deleteBatch("Comanda", comandasList);
      addLog("✅ Comandas eliminadas");
      setProgress(40);

      // 5. Gastos
      const gastosList = await base44.entities.Gasto.list();
      await deleteBatch("Gasto", gastosList);
      addLog("✅ Gastos eliminados");
      setProgress(60);

      // 6. Compras (No hay detalle compra separado en el esquema proporcionado, es directo)
      const compras = await base44.entities.Compra.list();
      await deleteBatch("Compra", compras);
      addLog("✅ Compras eliminadas");
      setProgress(65);

      // 7. Pagos de Cuentas por Cobrar (Dependencia de CuentaPorCobrar)
      const pagosCuentas = await base44.entities.PagoCuentaPorCobrar.list();
      await deleteBatch("PagoCuentaPorCobrar", pagosCuentas);

      // 8. Cuentas por Cobrar
      const cuentasPorCobrar = await base44.entities.CuentaPorCobrar.list();
      await deleteBatch("CuentaPorCobrar", cuentasPorCobrar);
      addLog("✅ Cuentas por cobrar eliminadas");
      setProgress(70);

      // 9. Alertas y Historial
      const alertas = await base44.entities.AlertaStock.list();
      await deleteBatch("AlertaStock", alertas);
      
      const historial = await base44.entities.HistorialCostoIngrediente.list();
      await deleteBatch("HistorialCostoIngrediente", historial);
      addLog("✅ Historial y alertas eliminados");
      setProgress(80);

      // 10. Logs
      const logLimpiezas = await base44.entities.LogLimpieza.list();
      await deleteBatch("LogLimpieza", logLimpiezas);
      
      // 11. Verificar Datos Esenciales
      addLog("🔍 Verificando datos esenciales...");
      
      // Verificar Empleados
      const currentEmpleados = await base44.entities.Empleado.list();
      if (currentEmpleados.length === 0) {
        addLog("⚠️ No se encontraron empleados. Creando admin por defecto...");
        await base44.entities.Empleado.create({
          nombre_completo: "Administrador",
          usuario: "admin",
          rol: "administrador",
          activo: true
        });
      }

      // Verificar Tasas
      const tasas = await base44.entities.TasaCambio.list();
      const tasaActiva = tasas.find(t => t.activa);
      if (!tasaActiva) {
        addLog("⚠️ No hay tasa activa. Creando tasa por defecto...");
        await base44.entities.TasaCambio.create({
          fecha: new Date().toISOString().split('T')[0],
          tasa_bs_usd: 50,
          tasa_cop_usd: 4000,
          activa: true
        });
      }

      setProgress(100);
      addLog("✨ SISTEMA COMPLETAMENTE LIMPIO Y RESETEADO");
      toast.success("Limpieza completada exitosamente");
      
      // Refresh UI
      queryClient.invalidateQueries();

    } catch (error) {
      console.error(error);
      addLog(`❌ Error crítico: ${error.message}`);
      toast.error("Error durante la limpieza");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-100 rounded-xl">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administración - Reset del Sistema</h1>
            <p className="text-gray-500">Herramientas avanzadas de limpieza y restauración</p>
          </div>
        </div>

        {/* Advertencia */}
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>ADVERTENCIA CRÍTICA</AlertTitle>
          <AlertDescription>
            Esta acción eliminará <strong>TODOS</strong> los datos transaccionales (Ventas, Comandas, Gastos, Historial).
            Los datos de configuración (Empleados, Platos, Ingredientes, Recetas) se mantendrán.
            <br/>
            <strong>Esta acción no se puede deshacer.</strong>
          </AlertDescription>
        </Alert>

        {/* Estado Actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase text-gray-500">
                <Database className="w-4 h-4" />
                Datos a Eliminar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="font-medium text-red-800">Comandas</span>
                <Badge variant="destructive">{comandas.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="font-medium text-red-800">Ventas</span>
                <Badge variant="destructive">{ventas.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="font-medium text-red-800">Gastos</span>
                <Badge variant="destructive">{gastos.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="font-medium text-red-800">Cuentas por Cobrar</span>
                <Badge variant="destructive">{cuentasPorCobrar.length}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase text-gray-500">
                <Server className="w-4 h-4" />
                Datos Seguros (Se mantienen)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="font-medium text-green-800">Empleados</span>
                <Badge className="bg-green-600">{empleados.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="font-medium text-green-800">Platos</span>
                <Badge className="bg-green-600">{platos.length}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="font-medium text-green-800">Ingredientes</span>
                <Badge className="bg-green-600">{ingredientes.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones */}
        <Card className="border-2 border-red-200 shadow-xl">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-800">Zona de Peligro</CardTitle>
            <CardDescription className="text-red-600">
              Acciones destructivas para el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {isCleaning && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Procesando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
              
              <Button 
                onClick={limpiezaTotal} 
                disabled={isCleaning}
                className="w-full bg-red-600 hover:bg-red-700 h-16 text-lg font-bold shadow-lg"
              >
                {isCleaning ? (
                  <>
                    <RefreshCcw className="w-6 h-6 mr-2 animate-spin" />
                    LIMPIANDO SISTEMA...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-6 h-6 mr-2" />
                    LIMPIEZA TOTAL DEL SISTEMA
                  </>
                )}
              </Button>
              
              {logs.length > 0 && (
                <div className="mt-4 p-4 bg-gray-900 rounded-lg text-green-400 font-mono text-xs max-h-60 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}