import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, CheckCircle, Utensils, User } from "lucide-react";
import { toast } from "sonner";

// Componente para el contador de tiempo real
const TiempoEspera = ({ fechaApertura }) => {
  const [minutos, setMinutos] = useState(0);

  useEffect(() => {
    const calcular = () => {
      const diff = Math.floor((new Date() - new Date(fechaApertura)) / 60000);
      setMinutos(diff);
    };
    calcular();
    const interval = setInterval(calcular, 60000);
    return () => clearInterval(interval);
  }, [fechaApertura]);

  const colorClass = minutos > 15 ? "text-red-500 animate-pulse" : "text-white/80";

  return (
    <div className={`flex items-center gap-1 font-bold ${colorClass}`}>
      <Clock className="w-4 h-4" />
      <span>{minutos} min</span>
    </div>
  );
};

export default function Cocina() {
  const queryClient = useQueryClient();
  const [comandasAgrupadas, setComandasAgrupadas] = useState([]);
  const [ultimaCantidadPlatos, setUltimaCantidadPlatos] = useState(0);

  // 1. Obtener comandas activas
  const { data: comandas = [] } = useQuery({
    queryKey: ['comandas-cocina'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 200),
    refetchInterval: 5000,
  });

  // 2. Obtener detalles de platos pendientes
  const { data: detalles = [] } = useQuery({
    queryKey: ['detalles-comandas-cocina'],
    queryFn: () => base44.entities.DetalleComanda.list('-created_date', 500),
    refetchInterval: 5000,
  });

  // 3. Agrupar platos por comanda
  useEffect(() => {
    const pendientes = detalles.filter(d => 
      d.estado_plato === 'pendiente' || d.estado_plato === 'en_preparacion'
    );

    const agrupadas = pendientes.reduce((acc, detalle) => {
      const comanda = comandas.find(c => c.id === detalle.comanda_id);
      if (!comanda) return acc;

      if (!acc[detalle.comanda_id]) {
        acc[detalle.comanda_id] = {
          ...comanda,
          platos: []
        };
      }
      acc[detalle.comanda_id].platos.push(detalle);
      return acc;
    }, {});

    const comandasArray = Object.values(agrupadas).sort((a, b) => 
      new Date(a.fecha_apertura) - new Date(b.fecha_apertura)
    );

    setComandasAgrupadas(comandasArray);
  }, [detalles, comandas]);

  // 4. Sonido de alerta para nuevos pedidos
  useEffect(() => {
    const cantidadActual = detalles.filter(d => d.estado_plato === 'pendiente').length;
    if (cantidadActual > ultimaCantidadPlatos && ultimaCantidadPlatos > 0) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGQc+ltryxnMlBSyAzfLYiTcIGWi77eeeTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQQxh9Hz04I0Bh5uwO/jmUgND1as5++wXRkHPpbZ8sVzJQUsgM3y2Ik3CBlou+3nnk0QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBACBResnbznkwQDU+m4++1Xx0GOZTa88l4LAYmeMjvAjRdYWZ7lNLYwmIbAzJpvvHL');
      audio.play().catch(() => {});
      toast("🔔 ¡Nuevo pedido recibido!", { position: "top-center" });
    }
    setUltimaCantidadPlatos(cantidadActual);
  }, [detalles]);

  // 5. Mutación para despachar COMANDA COMPLETA
  const despacharComandaMutation = useMutation({
    mutationFn: async (platos) => {
      const promesas = platos.map(plato => 
        base44.entities.DetalleComanda.update(plato.id, { estado_plato: 'listo' })
      );
      return Promise.all(promesas);
    },
    onSuccess: () => {
      toast.success("✅ Comanda completa despachada");
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas-cocina'] });
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 shadow-2xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <ChefHat className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter">SISTEMA KDS</h1>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-widest">Control de Producción</p>
            </div>
          </div>
          <div className="bg-black/20 px-6 py-2 rounded-2xl border border-white/10 text-center">
            <p className="text-orange-200 text-[10px] font-bold">MANTENIENDO</p>
            <p className="text-3xl font-black text-white">{comandasAgrupadas.length}</p>
          </div>
        </div>

        {/* Grid de Comandas */}
        {comandasAgrupadas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comandasAgrupadas.map((comanda) => (
              <Card key={comanda.id} className="bg-white border-none shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
                
                {/* Cabecera de Tarjeta */}
                <div className="bg-slate-800 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-orange-500 text-white px-3 py-1 rounded-lg font-black text-xl">
                        #{comanda.numero_comanda}
                      </div>
                      <div className="text-white">
                        <p className="text-[10px] text-slate-400 font-bold leading-none">MESA</p>
                        <p className="text-lg font-black leading-none">{comanda.mesa_numero}</p>
                      </div>
                    </div>
                    <TiempoEspera fechaApertura={comanda.fecha_apertura} />
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <User className="w-3 h-3" />
                    <span className="truncate uppercase font-medium">{comanda.mesero_nombre}</span>
                  </div>
                </div>

                {/* Lista de Platos */}
                <CardContent className="p-0 flex-1 bg-slate-50">
                  <div className="divide-y divide-slate-200">
                    {comanda.platos.map((plato) => (
                      <div key={plato.id} className="p-4 flex gap-4 items-start">
                        <div className="bg-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0">
                          {plato.cantidad}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 leading-tight">{plato.plato_nombre}</h3>
                          {plato.variante && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                              {plato.variante}
                            </span>
                          )}
                          {plato.notas_plato && (
                            <div className="mt-2 bg-amber-100/50 p-2 rounded border-l-2 border-amber-400">
                              <p className="text-xs text-amber-800 font-medium italic">"{plato.notas_plato}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                {/* Botón de Acción Finalizado */}
                <div className="p-4 bg-white mt-auto">
                  <Button
                    onClick={() => despacharComandaMutation.mutate(comanda.platos)}
                    disabled={despacharComandaMutation.isPending}
                    className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-[0_4px_0_rgb(22,101,52)] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center justify-center gap-0"
                  >
                    <span className="text-[10px] font-black opacity-80 uppercase tracking-tighter">Completar Pedido</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      <span className="text-xl font-black italic">¡TODO LISTO!</span>
                    </div>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Utensils className="w-10 h-10 text-slate-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-400 uppercase italic">Cocina en Silencio</h2>
              <p className="text-slate-600 text-sm">Los nuevos pedidos de los meseros aparecerán aquí con una alerta sonora.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}