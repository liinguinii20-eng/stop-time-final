import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, Save, Loader2, Sparkles, ArrowRightLeft } from "lucide-react";
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
      
      const tasaUSDActual = parseFloat(localStorage.getItem('tasa_usd_final')) || 0;
      
      await base44.entities.TasaCambio.create({
        fecha: hoy,
        tasa_bs_usd: tasaUSDActual,
        tasa_cop_usd: tasaCOPNum,
        activa: true,
        empleado_nombre: empleadoActual?.nombre_completo || "Sistema"
      });

      localStorage.setItem('tasa_cop_actual', tasaCOP);
      window.dispatchEvent(new CustomEvent('tasasActualizadas'));

      return tasaCOPNum;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-cambio'] });
      toast.success("✅ Tasa COP publicada con éxito");
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
      
      await base44.entities.TasaCambio.create({
        fecha: hoy,
        tasa_bs_usd: tasaFinal,
        tasa_cop_usd: tasaCOPActual,
        activa: true,
        empleado_nombre: empleadoActual?.nombre_completo || "Sistema"
      });

      localStorage.setItem('tasa_usd_base', tasaBase);
      localStorage.setItem('tasa_usd_final', tasaFinal.toString());
      window.dispatchEvent(new CustomEvent('tasasActualizadas'));

      return tasaFinal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-cambio'] });
      toast.success("✅ Tasa USD publicada con éxito");
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
    <div className="p-4 md:p-8 min-h-screen bg-slate-50/50 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Elegante */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200">
                <ArrowRightLeft className="w-8 h-8 text-white" />
              </div>
              Mercado de Divisas
            </h1>
            <p className="text-slate-500 font-medium ml-1">Sincronización global y control de tasas en tiempo real</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card USD */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group bg-white hover:shadow-2xl hover:shadow-emerald-200/40 transition-all duration-500 relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
              <DollarSign className="w-32 h-32" />
            </div>
            <CardContent className="p-8 space-y-8 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Tasa USD (Bolívares)</h2>
                </div>
                <p className="text-slate-500 text-sm pl-13">Tasa oficial BCV o monitor</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasa Base del Mercado</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Bs</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tasaUSDBase}
                      onChange={(e) => setTasaUSDBase(e.target.value)}
                      placeholder="36.50"
                      className="pl-12 h-16 text-2xl font-black bg-slate-50 border-none rounded-2xl focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all"
                    />
                  </div>
                </div>

                {tasaUSDBase && parseFloat(tasaUSDBase) > 0 && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white overflow-hidden shadow-lg shadow-emerald-500/30">
                      <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Sparkles className="w-24 h-24" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Tasa Operativa (+16%)</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl opacity-80">Bs</span>
                        <span className="text-5xl font-black tracking-tighter">
                          {(parseFloat(tasaUSDBase) * 1.16).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-bold uppercase text-emerald-800/60 mb-3">Conversiones Rápidas</p>
                      <div className="space-y-2 text-sm font-medium text-emerald-900">
                        <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                          <span className="opacity-70">$1.00 USD</span>
                          <span className="font-bold">Bs {(parseFloat(tasaUSDBase) * 1.16).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                          <span className="opacity-70">$10.00 USD</span>
                          <span className="font-bold">Bs {(parseFloat(tasaUSDBase) * 1.16 * 10).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="opacity-70">$100.00 USD</span>
                          <span className="font-bold">Bs {(parseFloat(tasaUSDBase) * 1.16 * 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleGuardarTasaUSD}
                disabled={actualizarTasaUSDMutation.isPending}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-95"
              >
                {actualizarTasaUSDMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> Publicar Tasa USD</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Card COP */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group bg-white hover:shadow-2xl hover:shadow-blue-200/40 transition-all duration-500 relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
              <TrendingUp className="w-32 h-32" />
            </div>
            <CardContent className="p-8 space-y-8 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Tasa Pesos (COP)</h2>
                </div>
                <p className="text-slate-500 text-sm pl-13">Tasa de cambio Frontera</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">COP por cada USD</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₡</span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={tasaCOP}
                      onChange={(e) => setTasaCOP(e.target.value)}
                      placeholder="4000"
                      className="pl-12 h-16 text-2xl font-black bg-slate-50 border-none rounded-2xl focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all"
                    />
                  </div>
                </div>

                {tasaCOP && parseFloat(tasaCOP) > 0 && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white overflow-hidden shadow-lg shadow-blue-500/30">
                      <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Sparkles className="w-24 h-24" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Tasa Operativa</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl opacity-80">₡</span>
                        <span className="text-5xl font-black tracking-tighter">
                          {parseFloat(tasaCOP).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-bold uppercase text-blue-800/60 mb-3">Conversiones Rápidas</p>
                      <div className="space-y-2 text-sm font-medium text-blue-900">
                        <div className="flex justify-between items-center border-b border-blue-100/50 pb-2">
                          <span className="opacity-70">$1.00 USD</span>
                          <span className="font-bold">₡ {parseFloat(tasaCOP).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-blue-100/50 pb-2">
                          <span className="opacity-70">$10.00 USD</span>
                          <span className="font-bold">₡ {(parseFloat(tasaCOP) * 10).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="opacity-70">$100.00 USD</span>
                          <span className="font-bold">₡ {(parseFloat(tasaCOP) * 100).toLocaleString('es-CO')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleGuardarTasaCOP}
                disabled={actualizarTasaCOPMutation.isPending}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95"
              >
                {actualizarTasaCOPMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> Publicar Tasa COP</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historial Timeline */}
        <div className="pt-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Clock className="w-6 h-6 text-slate-400" />
              Historial de Actualizaciones
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasas.slice(0, 8).map((tasa) => (
              <div
                key={tasa.id}
                className="group p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">
                      {format(new Date(tasa.fecha), "d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-amber-400 transition-colors" />
                      {tasa.empleado_nombre} a las {format(new Date(tasa.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tasa Bs</p>
                    <p className="text-sm font-bold text-emerald-600">
                      Bs {tasa.tasa_bs_usd?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '---'}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tasa COP</p>
                    <p className="text-sm font-bold text-blue-600">
                      ₡ {tasa.tasa_cop_usd?.toLocaleString('es-CO') || '---'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}