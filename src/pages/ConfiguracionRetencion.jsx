import React, { useState } from "react";
import { api } from "@/api/apiAdapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Database, AlertTriangle, CheckCircle, Loader2,
  CalendarDays, TrendingUp, ShieldAlert, FileSpreadsheet, Lock, Sparkles
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfiguracionRetencion() {
  const [limpiando, setLimpiando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: resumen, isLoading: loadingResumen, refetch } = useQuery({
    queryKey: ['resumen-depuracion'],
    queryFn: () => api.mantenimiento.getResumen(),
  });

  const ejecutarCierreTrimestral = async () => {
    setMostrarConfirmacion(false);
    setLimpiando(true);
    try {
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
      
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

      // Descargar Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cierre_Trimestral_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Refrescar estado global
      queryClient.invalidateQueries();
      refetch();
      
      setIsSuccess(true);
      toast.success("Cierre trimestral ejecutado y Excel descargado correctamente.");
    } catch (error) {
      console.error("Error en limpieza:", error);
      toast.error(error.message || "Hubo un problema al ejecutar el cierre");
    } finally {
      setLimpiando(false);
    }
  };

  if (loadingResumen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 relative z-10" />
        </div>
        <p className="text-gray-500 mt-4 animate-pulse font-medium">Analizando historial financiero...</p>
      </div>
    );
  }

  const t = resumen?.totales || {};
  const totalRegistros = resumen?.conteos ? Object.values(resumen.conteos).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-4 md:p-8 min-h-[90vh] bg-[#FAF9F6]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Elegante */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-8 shadow-2xl text-white">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold tracking-wide text-indigo-100 uppercase mb-2">
                <Sparkles size={14} className="text-purple-300" />
                Módulo Financiero
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                Cierre Trimestral
              </h1>
              <p className="text-indigo-200 max-w-xl text-sm md:text-base leading-relaxed">
                Asistente automatizado para la exportación de libros contables en Excel y depuración segura de registros históricos del sistema.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner">
              <div className="bg-indigo-500/30 p-3 rounded-xl">
                <CalendarDays className="w-8 h-8 text-indigo-100" />
              </div>
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Último corte hasta</p>
                <p className="text-white font-bold text-lg">
                  {resumen?.fechaLimite ? format(parseISO(resumen.fechaLimite), "dd/MM/yyyy", { locale: es }) : 'Hoy'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Control y Botón Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Acción Principal */}
            <Card className="border-none shadow-xl shadow-indigo-100/50 bg-white overflow-hidden rounded-3xl relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
              <CardContent className="p-8 md:p-10">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-2 ring-8 ring-indigo-50/50">
                    <FileSpreadsheet className="w-10 h-10 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Exportar y Limpiar Base de Datos</h2>
                    <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                      Este proceso descargará el <strong>Excel estructurado</strong> (separando USD y Bolívares) y liberará espacio purgiendo el historial cerrado.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setMostrarConfirmacion(true)}
                    disabled={limpiando || isSuccess}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] hover:-translate-y-1 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none w-full sm:w-auto overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                    {limpiando ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                        <span className="relative z-10">Procesando Cierre...</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle className="w-5 h-5 relative z-10" />
                        <span className="relative z-10">Cierre Completado</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 relative z-10" />
                        <span className="relative z-10">Ejecutar Cierre Trimestral Definitivo</span>
                      </>
                    )}
                  </button>

                  {isSuccess && (
                    <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-start gap-3 text-left w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">¡Operación Exitosa!</p>
                        <p className="text-sm text-emerald-600 mt-1">El archivo ha sido descargado y los registros antiguos se purgaron correctamente preservando la integridad del catálogo y cuentas pendientes.</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reglas e Integridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-start">
                <div className="bg-emerald-50 p-2.5 rounded-xl shrink-0">
                  <ShieldAlert className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Integridad Garantizada</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    No se borran Platos, Recetas, Usuarios ni Cuentas por Cobrar que tengan saldo pendiente a favor.
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-start">
                <div className="bg-amber-50 p-2.5 rounded-xl shrink-0">
                  <Database className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Aligeramiento</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Purga masiva de comandas cerradas y transacciones viejas para mejorar la velocidad del sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Datos a Depurar
            </h3>
            
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100/50">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Registros</p>
                  <p className="text-4xl font-black text-gray-900 tracking-tight">{totalRegistros}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-indigo-600" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">Ventas Completadas</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.ventas || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                <div className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">Comandas Pagadas</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.comandas || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">Gastos Procesados</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.gastos || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: '60%' }}></div>
                  </div>
                </div>
                
                <div className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">Adelantos</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.adelantos || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl shadow-gray-900/20">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Métricas Pre-Cierre</h4>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-300 text-sm">Utilidad USD</span>
                  <span className="font-bold text-emerald-400">${(t.utilidadUSD || t.utilidadEstimada || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Utilidad Bolívares</span>
                  <span className="font-bold text-emerald-400">Bs {(t.utilidadBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Confirmación Moderno */}
      <AlertDialog open={mostrarConfirmacion} onOpenChange={setMostrarConfirmacion}>
        <AlertDialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 ring-8 ring-white">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-red-900">
              Cierre Irreversible
            </AlertDialogTitle>
          </div>
          
          <div className="p-6">
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-gray-600 font-medium text-center">
                  Estás a punto de vaciar el historial transaccional del sistema.
                </p>
                <ul className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Se descargará un <strong>Excel con 4 hojas</strong> estructurado financieramente.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Se eliminarán Ventas, Comandas cerradas, Gastos y CxC cobradas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>No se tocarán Clientes, Inventario, ni Deudas activas.</span>
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </div>
          
          <div className="p-6 pt-0 flex gap-3">
            <AlertDialogCancel className="w-full border-0 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold h-12 m-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={ejecutarCierreTrimestral} 
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-12 m-0 shadow-lg shadow-red-200"
            >
              Sí, Borrar y Descargar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}