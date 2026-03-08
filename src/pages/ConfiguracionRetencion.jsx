import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Trash2, 
  Calendar, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  History,
  RefreshCw
} from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfiguracionRetencion() {
  const [limpiando, setLimpiando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [resultadoLimpieza, setResultadoLimpieza] = useState(null);
  const queryClient = useQueryClient();

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Venta.list('-created_date', 2000),
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 2000),
  });

  const { data: comandas = [], isLoading: loadingComandas } = useQuery({
    queryKey: ['comandas'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 2000),
  });

  const { data: logLimpiezas = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['log-limpiezas'],
    queryFn: () => base44.entities.LogLimpieza.list('-created_date', 20),
  });

  const MESES_RETENCION = 3;
  const fechaLimite = subMonths(new Date(), MESES_RETENCION);

  // Calcular estadísticas
  const ventasAntiguas = ventas.filter(v => {
    try {
      return parseISO(v.fecha_hora) < fechaLimite;
    } catch { return false; }
  });

  const gastosAntiguos = gastos.filter(g => {
    try {
      return parseISO(g.fecha_gasto) < fechaLimite;
    } catch { return false; }
  });

  const comandasAntiguas = comandas.filter(c => {
    try {
      return parseISO(c.fecha_apertura) < fechaLimite && c.estado === 'pagada';
    } catch { return false; }
  });

  const totalRegistros = ventas.length + gastos.length + comandas.length;
  const totalAntiguos = ventasAntiguas.length + gastosAntiguos.length + comandasAntiguas.length;

  const ejecutarLimpieza = async () => {
    setMostrarConfirmacion(false);
    setLimpiando(true);
    setResultadoLimpieza(null);

    let registrosEliminados = 0;
    let errores = [];

    try {
      console.log("🧹 INICIANDO LIMPIEZA DE DATOS ANTIGUOS...");
      console.log(`📅 Fecha límite: ${format(fechaLimite, 'dd/MM/yyyy', { locale: es })}`);

      // 1. Eliminar ventas antiguas
      console.log(`🗑️ Eliminando ${ventasAntiguas.length} ventas antiguas...`);
      for (const venta of ventasAntiguas) {
        try {
          await base44.entities.Venta.delete(venta.id);
          registrosEliminados++;
        } catch (e) {
          errores.push(`Venta ${venta.id}: ${e.message}`);
        }
      }

      // 2. Eliminar gastos antiguos
      console.log(`🗑️ Eliminando ${gastosAntiguos.length} gastos antiguos...`);
      for (const gasto of gastosAntiguos) {
        try {
          await base44.entities.Gasto.delete(gasto.id);
          registrosEliminados++;
        } catch (e) {
          errores.push(`Gasto ${gasto.id}: ${e.message}`);
        }
      }

      // 3. Eliminar comandas antiguas pagadas
      console.log(`🗑️ Eliminando ${comandasAntiguas.length} comandas antiguas...`);
      for (const comanda of comandasAntiguas) {
        try {
          await base44.entities.Comanda.delete(comanda.id);
          registrosEliminados++;
        } catch (e) {
          errores.push(`Comanda ${comanda.id}: ${e.message}`);
        }
      }

      // Registrar la limpieza
      await base44.entities.LogLimpieza.create({
        fecha_ejecucion: new Date().toISOString(),
        registros_eliminados: registrosEliminados,
        tipo: 'manual',
        exitosa: errores.length === 0,
        error: errores.length > 0 ? errores.join('; ') : null,
        detalles: `Ventas: ${ventasAntiguas.length}, Gastos: ${gastosAntiguos.length}, Comandas: ${comandasAntiguas.length}`
      });

      setResultadoLimpieza({
        success: true,
        registrosEliminados,
        errores,
        detalles: {
          ventas: ventasAntiguas.length,
          gastos: gastosAntiguos.length,
          comandas: comandasAntiguas.length
        }
      });

      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      refetchLogs();

      toast.success(`✅ Limpieza completada: ${registrosEliminados} registros eliminados`);

    } catch (error) {
      console.error("❌ Error en limpieza:", error);
      
      await base44.entities.LogLimpieza.create({
        fecha_ejecucion: new Date().toISOString(),
        registros_eliminados: registrosEliminados,
        tipo: 'manual',
        exitosa: false,
        error: error.message
      });

      setResultadoLimpieza({
        success: false,
        error: error.message,
        registrosEliminados
      });

      toast.error("Error durante la limpieza: " + error.message);
    } finally {
      setLimpiando(false);
    }
  };

  const isLoading = loadingVentas || loadingGastos || loadingComandas;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" />
            Configuración de Retención
          </h1>
          <p className="text-gray-500 mt-1">Gestiona la retención y limpieza automática de datos</p>
        </div>

        {/* Configuración Actual */}
        <Card className="shadow-lg border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Configuración Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Período de Retención</p>
                <p className="text-3xl font-bold text-purple-600">{MESES_RETENCION} meses</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Fecha Límite</p>
                <p className="text-lg font-bold text-blue-600">
                  {format(fechaLimite, "dd 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Registros Antiguos</p>
                <p className="text-3xl font-bold text-amber-600">{totalAntiguos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estado de la Base de Datos */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Estado de la Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Ventas</span>
                      <Badge variant="outline">{ventas.length}</Badge>
                    </div>
                    {ventasAntiguas.length > 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ {ventasAntiguas.length} antiguas
                      </p>
                    )}
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gastos</span>
                      <Badge variant="outline">{gastos.length}</Badge>
                    </div>
                    {gastosAntiguos.length > 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ {gastosAntiguos.length} antiguos
                      </p>
                    )}
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Comandas</span>
                      <Badge variant="outline">{comandas.length}</Badge>
                    </div>
                    {comandasAntiguas.length > 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ {comandasAntiguas.length} antiguas
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total de Registros</span>
                    <span className="text-xl font-bold">{totalRegistros}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card className="shadow-lg border-2 border-red-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Limpieza Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {totalAntiguos > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">
                      Se encontraron {totalAntiguos} registros antiguos
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                      {ventasAntiguas.length} ventas, {gastosAntiguos.length} gastos, {comandasAntiguas.length} comandas
                      anteriores al {format(fechaLimite, "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-green-900">
                    No hay registros antiguos para eliminar
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={() => setMostrarConfirmacion(true)}
              disabled={limpiando || totalAntiguos === 0}
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {limpiando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ejecutando limpieza...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Ejecutar Limpieza Manual ({totalAntiguos} registros)
                </>
              )}
            </Button>

            {resultadoLimpieza && (
              <div className={`rounded-lg p-4 ${resultadoLimpieza.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {resultadoLimpieza.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-bold ${resultadoLimpieza.success ? 'text-green-900' : 'text-red-900'}`}>
                    {resultadoLimpieza.success ? 'Limpieza Completada' : 'Error en Limpieza'}
                  </span>
                </div>
                <p className="text-sm">
                  Registros eliminados: <strong>{resultadoLimpieza.registrosEliminados}</strong>
                </p>
                {resultadoLimpieza.detalles && (
                  <p className="text-xs text-gray-600 mt-1">
                    Ventas: {resultadoLimpieza.detalles.ventas}, 
                    Gastos: {resultadoLimpieza.detalles.gastos}, 
                    Comandas: {resultadoLimpieza.detalles.comandas}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Limpiezas */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Limpiezas
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchLogs()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingLogs ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : logLimpiezas.length > 0 ? (
              <div className="space-y-3">
                {logLimpiezas.map((log) => (
                  <div key={log.id} className={`p-3 rounded-lg border ${log.exitosa ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {log.exitosa ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium">
                            {log.registros_eliminados} registros eliminados
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.tipo}
                          </Badge>
                        </div>
                        {log.detalles && (
                          <p className="text-xs text-gray-600 mt-1">{log.detalles}</p>
                        )}
                        {log.error && (
                          <p className="text-xs text-red-600 mt-1">{log.error}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(parseISO(log.fecha_ejecucion), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay registros de limpieza</p>
            )}
          </CardContent>
        </Card>

        {/* Advertencia */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-900">⚠️ ADVERTENCIA</p>
              <p className="text-sm text-amber-800 mt-1">
                Los datos mayores a {MESES_RETENCION} meses se eliminarán permanentemente. 
                Asegúrate de exportar los reportes necesarios antes de ejecutar la limpieza.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de Confirmación */}
      <AlertDialog open={mostrarConfirmacion} onOpenChange={setMostrarConfirmacion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirmar Limpieza
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  Esta acción eliminará permanentemente <strong>{totalAntiguos} registros</strong> anteriores al {format(fechaLimite, "dd/MM/yyyy", { locale: es })}:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>{ventasAntiguas.length} ventas</li>
                  <li>{gastosAntiguos.length} gastos</li>
                  <li>{comandasAntiguas.length} comandas pagadas</li>
                </ul>
                <p className="text-red-600 font-medium">
                  ⚠️ Esta acción no se puede deshacer.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={ejecutarLimpieza}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar Registros
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}