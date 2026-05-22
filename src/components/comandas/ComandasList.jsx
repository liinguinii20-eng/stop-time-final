import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Clock, User, Utensils, Eye, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ComandaPrintView from "./ComandaPrintView";

export default function ComandasList({ comandas, detalles, onVerDetalle, isLoading }) {
  const [comandaImprimir, setComandaImprimir] = useState(null);
  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (comandas.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-8 sm:p-12 text-center">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm sm:text-base">No se encontraron comandas</p>
        </CardContent>
      </Card>
    );
  }

  const estadoConfig = {
    abierta: { color: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Abierta" },
    cerrada: { color: "bg-amber-50 text-amber-700 border-amber-100", label: "Cerrada" },
    pagada: { color: "bg-blue-50 text-blue-700 border-blue-100", label: "Pagada" }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
      {comandas.map((comanda) => {
        const platosComanda = detalles.filter(d => d.comanda_id === comanda.id);
        const totalPlatos = platosComanda.reduce((sum, d) => sum + d.cantidad, 0);
        const estadoInfo = estadoConfig[comanda.estado] || estadoConfig.abierta;

        return (
          <Card key={comanda.id} className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between">
            <div>
              {/* Encabezado elegante */}
              <CardHeader className="p-6 bg-gradient-to-br from-slate-50 to-amber-50/10 border-b border-slate-100">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span className="truncate">{comanda.numero_comanda}</span>
                    </CardTitle>
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 mt-1.5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {format(new Date(comanda.fecha_apertura), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${estadoInfo.color} border px-3 py-1 rounded-full text-xs font-black`}>
                      {estadoInfo.label}
                    </Badge>
                    {comanda.tipo_movimiento === 'MERMA' && (
                      <Badge className="bg-red-50 text-red-700 border-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Merma
                      </Badge>
                    )}
                    {comanda.tipo_movimiento === 'CREDITO_EMPLEADO' && (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Crédito
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Contenido principal */}
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
                      <span>🪑</span>
                      Mesa
                    </span>
                    <span className="font-extrabold text-slate-800 text-lg bg-slate-50 px-3 py-1 rounded-xl">
                      Mesa {comanda.mesa_numero}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      Mesero
                    </span>
                    <span className="font-semibold text-slate-700 bg-slate-50 px-3 py-1 rounded-xl truncate max-w-[150px]">
                      {comanda.mesero_nombre}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-slate-400" />
                      Platos pedidos
                    </span>
                    <span className="font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl">
                      {totalPlatos} {totalPlatos === 1 ? 'plato' : 'platos'}
                    </span>
                  </div>
                  
                  {comanda.tipo_movimiento === 'MERMA' && comanda.motivo_merma && (
                    <div className="flex items-center justify-between text-sm mt-2 border-t border-red-50 pt-3">
                      <span className="text-red-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
                        Motivo
                      </span>
                      <span className="font-semibold text-red-700 truncate max-w-[150px]">
                        {comanda.motivo_merma}
                      </span>
                    </div>
                  )}

                  {comanda.tipo_movimiento === 'CREDITO_EMPLEADO' && comanda.empleado_id && (
                    <div className="flex items-center justify-between text-sm mt-2 border-t border-purple-50 pt-3">
                      <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
                        Empleado
                      </span>
                      <span className="font-semibold text-purple-700 truncate max-w-[150px]">
                        ID: {comanda.empleado_id.substring(0, 5)}...
                      </span>
                    </div>
                  )}
                </div>

                {comanda.notas && (
                  <div className="p-3 bg-amber-50/50 rounded-2xl border-l-4 border-amber-400">
                    <p className="text-xs text-amber-800 font-medium italic">"{comanda.notas}"</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total a Pagar</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    ${(comanda.total_comanda ?? 0).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </div>

            {/* Acciones */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <Button
                onClick={() => onVerDetalle(comanda)}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-12 font-bold shadow-lg shadow-amber-200/50 hover:scale-[1.02] active:scale-95 transition-all"
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalle
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setComandaImprimir(comanda);
                }}
                type="button"
                variant="outline"
                size="sm"
                className="w-12 h-12 rounded-2xl border-slate-200 bg-white hover:bg-slate-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center p-0"
                title="Imprimir comanda"
              >
                <Printer className="w-4 h-4 text-slate-600" />
              </Button>
            </div>
          </Card>
        );
      })}

      {/* Modal de impresión */}
      <ComandaPrintView
        isOpen={!!comandaImprimir}
        onClose={() => setComandaImprimir(null)}
        comanda={comandaImprimir}
        detalles={comandaImprimir ? detalles.filter(d => d.comanda_id === comandaImprimir.id) : []}
        tipo="caja"
      />
    </div>
  );
}