import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function GestionTasas() {
  const [tasaCOP, setTasaCOP] = useState("");
  const [tasaUSDBase, setTasaUSDBase] = useState("");
  const [empleadoActual, setEmpleadoActual] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const empleadoSesion = localStorage.getItem('empleado_sesion');
    if (empleadoSesion) {
      setEmpleadoActual(JSON.parse(empleadoSesion));
    }
    
    // Cargar tasas guardadas
    const tasaCOPGuardada = localStorage.getItem('tasa_cop_actual');
    if (tasaCOPGuardada) {
      setTasaCOP(tasaCOPGuardada);
    }

    const tasaUSDGuardada = localStorage.getItem('tasa_usd_base');
    if (tasaUSDGuardada) {
      setTasaUSDBase(tasaUSDGuardada);
    }
  }, []);

  const { data: tasas = [] } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 30),
  });



  const actualizarTasaCOPMutation = useMutation({
    mutationFn: async (tasaCOP) => {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const tasaCOPNum = parseFloat(tasaCOP);
      
      // Obtener la tasa USD actual o usar la guardada
      const tasaUSDActual = parseFloat(localStorage.getItem('tasa_usd_final')) || 0;
      
      // Buscar si ya existe una tasa activa para hoy
      const tasaHoyActiva = tasas.find(t => t.fecha === hoy && t.activa);
      
      if (tasaHoyActiva) {
        // Actualizar la tasa existente
        await base44.entities.TasaCambio.update(tasaHoyActiva.id, {
          tasa_cop_usd: tasaCOPNum,
          empleado_nombre: empleadoActual?.nombre_completo || "Sistema"
        });
      } else {
        // Crear nueva tasa en BD
        await base44.entities.TasaCambio.create({
          fecha: hoy,
          tasa_bs_usd: tasaUSDActual,
          tasa_cop_usd: tasaCOPNum,
          activa: true,
          empleado_nombre: empleadoActual?.nombre_completo || "Sistema"
        });
      }

      // Guardar en localStorage
      localStorage.setItem('tasa_cop_actual', tasaCOP);
      window.dispatchEvent(new CustomEvent('tasasActualizadas'));

      return tasaCOPNum;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-cambio'] });
      toast.success("✅ Tasa COP actualizada en BD y sincronizada");
    },
    onError: () => {
      toast.error("❌ Error al actualizar la tasa COP");
    }
  });

  const handleGuardarTasaCOP = () => {
    if (!tasaCOP || parseFloat(tasaCOP) <= 0) {
      toast.error("Por favor ingresa una tasa COP válida");
      return;
    }
    
    actualizarTasaCOPMutation.mutate(tasaCOP);
  };

  const actualizarTasaUSDMutation = useMutation({
    mutationFn: async (tasaBase) => {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const tasaFinal = parseFloat(tasaBase) * 1.16;
      const tasaCOPActual = parseFloat(localStorage.getItem('tasa_cop_actual') || '4000');
      
      // Buscar si ya existe una tasa activa para hoy
      const tasaHoyActiva = tasas.find(t => t.fecha === hoy && t.activa);
      
      if (tasaHoyActiva) {
        // Actualizar la tasa existente
        await base44.entities.TasaCambio.update(tasaHoyActiva.id, {
          tasa_bs_usd: tasaFinal,
          empleado_nombre: empleadoActual?.nombre_completo || "Sistema"
        });
      } else {
        // Crear nueva tasa en BD
        await base44.entities.TasaCambio.create({
          fecha: hoy,
          tasa_bs_usd: tasaFinal,
          tasa_cop_usd: tasaCOPActual,
          activa: true,
          empleado_nombre: empleadoActual?.nombre_completo || "Sistema"
        });
      }

      // Guardar en localStorage
      localStorage.setItem('tasa_usd_base', tasaBase);
      localStorage.setItem('tasa_usd_final', tasaFinal.toString());
      window.dispatchEvent(new CustomEvent('tasasActualizadas'));

      return tasaFinal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-cambio'] });
      toast.success("✅ Tasa USD actualizada en BD y sincronizada");
    },
    onError: () => {
      toast.error("❌ Error al actualizar la tasa USD");
    }
  });

  const handleGuardarTasaUSD = () => {
    if (!tasaUSDBase || parseFloat(tasaUSDBase) <= 0) {
      toast.error("Por favor ingresa una tasa USD válida");
      return;
    }
    actualizarTasaUSDMutation.mutate(tasaUSDBase);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <span className="leading-tight">Gestión de Tasas de Cambio</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Administra las tasas diarias de conversión
          </p>
        </div>

        {/* Configuración Tasa USD */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-emerald-50 to-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Configuración Global Tasa USD (Bolívares)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tasaUSDBase">Tasa Base de Mercado (Bs/USD)</Label>
              <Input
                id="tasaUSDBase"
                type="number"
                step="0.01"
                min="0"
                value={tasaUSDBase}
                onChange={(e) => setTasaUSDBase(e.target.value)}
                placeholder="36.50"
                className="text-lg font-semibold"
              />
            </div>
            
            {tasaUSDBase && parseFloat(tasaUSDBase) > 0 && (
              <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-inner">
                <p className="text-xs opacity-90 mb-1 font-bold uppercase tracking-wider">Tasa Aplicada con +16%</p>
                <p className="text-3xl font-black">
                  Bs {(parseFloat(tasaUSDBase) * 1.16).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {tasaUSDBase && parseFloat(tasaUSDBase) > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-emerald-900 mb-2">Vista Previa:</p>
                <div className="space-y-1 text-sm text-emerald-800">
                  <p>$1 USD = Bs {(parseFloat(tasaUSDBase) * 1.16).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                  <p>$10 USD = Bs {(parseFloat(tasaUSDBase) * 1.16 * 10).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                  <p>$100 USD = Bs {(parseFloat(tasaUSDBase) * 1.16 * 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleGuardarTasaUSD}
              disabled={actualizarTasaUSDMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {actualizarTasaUSDMutation.isPending ? "Guardando..." : "Guardar y Sincronizar Tasa USD"}
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                🔄 Se aplicará automáticamente el recargo del 16% y se sincronizará en tiempo real
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración Tasa COP */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Configuración Global Tasa COP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tasaCOP">Tasa Pesos Colombianos por USD</Label>
              <Input
                id="tasaCOP"
                type="number"
                step="1"
                min="0"
                value={tasaCOP}
                onChange={(e) => setTasaCOP(e.target.value)}
                placeholder="4000"
                className="text-lg font-semibold"
              />
            </div>
            
            {tasaCOP && parseFloat(tasaCOP) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Vista Previa:</p>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>$1 USD = ₡ {parseFloat(tasaCOP).toLocaleString('es-CO')}</p>
                  <p>$10 USD = ₡ {(parseFloat(tasaCOP) * 10).toLocaleString('es-CO')}</p>
                  <p>$100 USD = ₡ {(parseFloat(tasaCOP) * 100).toLocaleString('es-CO')}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleGuardarTasaCOP}
              disabled={actualizarTasaCOPMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {actualizarTasaCOPMutation.isPending ? "Guardando..." : "Guardar y Sincronizar Tasa COP"}
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                🔄 Esta tasa se sincronizará automáticamente en todas las páginas sin necesidad de recargar
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Historial */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Historial de Tasas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasas.slice(0, 10).map((tasa) => (
                <div
                  key={tasa.id}
                  className="p-4 bg-gray-50 rounded-lg space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(tasa.fecha), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-gray-500">{tasa.empleado_nombre}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(tasa.created_date), 'HH:mm')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-emerald-700 mb-1 font-semibold">USD (+16%)</p>
                      <p className="text-lg font-bold text-emerald-600">
                        Bs {tasa.tasa_bs_usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700 mb-1 font-semibold">COP</p>
                      <p className="text-lg font-bold text-blue-600">
                        ₡ {tasa.tasa_cop_usd.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}