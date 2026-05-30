import { Card, CardContent } from "@/components/ui/card";
import { Receipt, CheckCircle2, XCircle, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const METODOS_LABEL = {
  'efectivo_usd': '💵 Efectivo USD',
  'zelle': '🔷 Zelle',
  'binance': '🟡 Binance',
  'nequi': '🟣 Nequi',
  'pago_movil_bs': '📱 Pago Móvil',
  'transferencia_bs': '🏦 Transferencia Bs',
  'efectivo_bs': '💴 Efectivo Bs',
  'efectivo_cop': '💶 Efectivo COP',
  'mixto': '🔀 Pago Mixto',
};

const MONEDA_SIMBOLO = {
  'USD': '$',
  'BS': 'Bs',
  'COP': 'COP$',
};

export default function HistorialNomina({ nominas = [], adelantos = [], isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── SECCIÓN PAGOS DE NÓMINA ─── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-1">
          <Receipt className="w-6 h-6 text-violet-600" />
          Pagos de Nómina
        </h2>
        
        {nominas.length === 0 ? (
          <Card className="shadow-lg border-none">
            <CardContent className="text-center py-12 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay registros de nómina</p>
              <p className="text-sm">Los pagos procesados aparecerán aquí</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-none overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" id="tabla-historial-nomina">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                      <th className="text-left px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Fecha</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Empleado</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Base</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Adelantos</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Neto Pagado</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Método</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Convertido</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-violet-800 uppercase text-xs tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {nominas.map((nom) => {
                      const fechaPago = nom.fecha_pago ? format(new Date(nom.fecha_pago), "dd MMM yyyy", { locale: es }) : '—';
                      const isAnulado = nom.estado === 'ANULADO';
                      const monedaSimbolo = MONEDA_SIMBOLO[nom.moneda_pago] ?? '$';

                      return (
                        <tr key={nom.id} className={`hover:bg-violet-50/30 transition-colors ${isAnulado ? 'opacity-50 bg-gray-50' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                              <span>{fechaPago}</span>
                            </div>
                            {nom.periodo_inicio && nom.periodo_fin && (
                              <p className="text-[10px] text-gray-400 mt-0.5 pl-5.5">
                                {format(new Date(nom.periodo_inicio), "dd/MM", { locale: es })} — {format(new Date(nom.periodo_fin), "dd/MM", { locale: es })}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow">
                                {nom.empleado_nombre?.charAt(0)?.toUpperCase() ?? '?'}
                              </div>
                              <span className="font-medium text-gray-900">{nom.empleado_nombre}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-600">${(nom.salario_base ?? 0).toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right">
                            {(nom.total_adelantos ?? 0) > 0 ? (
                              <span className="text-amber-600 font-medium">-${(nom.total_adelantos ?? 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="font-bold text-violet-700">${(nom.salario_neto ?? 0).toFixed(2)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-600">
                              {METODOS_LABEL[nom.metodo_pago] ?? nom.metodo_pago ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {nom.moneda_pago !== 'USD' ? (
                              <div>
                                <span className="font-semibold text-gray-800">
                                  {monedaSimbolo} {(nom.monto_convertido ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <p className="text-[10px] text-gray-400">×{(nom.tasa_cambio ?? 1).toFixed(2)}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isAnulado ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                <XCircle className="w-3 h-3" /> Anulado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Pagado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── SECCIÓN ADELANTOS ENTREGADOS ─── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-1">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          Adelantos Registrados
        </h2>

        {adelantos.length === 0 ? (
          <Card className="shadow-lg border-none">
            <CardContent className="text-center py-12 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay adelantos registrados</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-none overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                      <th className="text-left px-5 py-3.5 font-semibold text-emerald-800 uppercase text-xs tracking-wider">Fecha</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-emerald-800 uppercase text-xs tracking-wider">Empleado</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-emerald-800 uppercase text-xs tracking-wider">Monto</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-emerald-800 uppercase text-xs tracking-wider">Método</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-emerald-800 uppercase text-xs tracking-wider">Notas</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-emerald-800 uppercase text-xs tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {adelantos.map((adel) => {
                      const fechaReal = adel.fecha_adelanto || adel.fecha;
                      const fechaAdelanto = fechaReal ? format(new Date(fechaReal), "dd MMM yyyy", { locale: es }) : '—';
                      const estado = adel.estado?.toUpperCase() || 'PENDIENTE';
                      const empNombre = adel.empleado_nombre || adel.empleado || 'Desconocido';
                      
                      return (
                        <tr key={adel.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span>{fechaAdelanto}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow">
                                {empNombre.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{empNombre}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                            ${(adel.monto ?? 0).toFixed(2)}
                            {adel.moneda_original && adel.moneda_original !== 'USD' && (
                              <div className="text-[10px] text-gray-400 font-normal">
                                {adel.moneda_original === 'BS' ? 'Bs' : 'COP'} {(adel.monto_original ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-600">
                              {METODOS_LABEL[adel.metodo_pago] ?? adel.metodo_pago ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate">
                            {adel.notas || adel.descripcion || <span className="italic text-gray-300">Sin notas</span>}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {estado === 'DESCONTADO' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Descontado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                <DollarSign className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
