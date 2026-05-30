import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign, ArrowRight, CheckCircle2, AlertTriangle,
  Wallet, Receipt, ArrowDown, RefreshCw, TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ModalPagoMixto from "../comandas/ModalPagoMixto";

const METODOS_PAGO = [
  { value: 'mixto', label: 'Pago Mixto', icon: '🔀', moneda: 'USD' },
  { value: 'efectivo_usd', label: 'Efectivo USD', icon: '💵', moneda: 'USD' },
  { value: 'zelle_usd', label: 'Zelle', icon: '🔷', moneda: 'USD' },
  { value: 'binance_usd', label: 'Binance / USDT', icon: '🟡', moneda: 'USD' },
  { value: 'zinli_usd', label: 'Zinli', icon: '📱', moneda: 'USD' },
  { value: 'paypal_usd', label: 'PayPal', icon: '🌐', moneda: 'USD' },
  { value: 'nequi_cop', label: 'Nequi', icon: '🟣', moneda: 'COP' },
  { value: 'pago_movil_bs', label: 'Pago Móvil (Bs)', icon: '📱', moneda: 'BS' },
  { value: 'tarjeta_bs', label: 'Tarjeta Bs', icon: '💳', moneda: 'BS' },
  { value: 'efectivo_cop', label: 'Efectivo Pesos', icon: '💶', moneda: 'COP' },
];

const MONEDAS = {
  USD: { simbolo: '$', nombre: 'Dólares USD' },
  BS: { simbolo: 'Bs', nombre: 'Bolívares' },
  COP: { simbolo: 'COP$', nombre: 'Pesos Colombianos' },
};

export default function ModalPagarNomina({ open, onClose, previewData, onConfirmar, isPaying }) {
  const [metodoPago, setMetodoPago] = useState('efectivo_usd');
  const [monedaPago, setMonedaPago] = useState('USD');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [notas, setNotas] = useState('');
  const [mostrarPagoMixto, setMostrarPagoMixto] = useState(false);

  const { empleado, adelantos = [], cuentas = [], tasa } = previewData ?? {};

  const [valoresAdelantos, setValoresAdelantos] = useState({});
  const [valoresCuentas, setValoresCuentas] = useState({});

  useEffect(() => {
    if (previewData) {
      const initialAdelantos = {};
      (previewData.adelantos || []).forEach(a => {
        initialAdelantos[a.id] = a.monto_pendiente ?? a.monto ?? 0;
      });
      setValoresAdelantos(initialAdelantos);

      const initialCuentas = {};
      (previewData.cuentas || []).forEach(c => {
        initialCuentas[c.id] = c.monto_pendiente ?? c.monto ?? 0;
      });
      setValoresCuentas(initialCuentas);
    }
  }, [previewData]);

  // Totales dinámicos
  const totalAdelantosDinamico = useMemo(() => Object.values(valoresAdelantos).reduce((sum, val) => sum + (Number(val) || 0), 0), [valoresAdelantos]);
  const totalCuentasDinamico = useMemo(() => Object.values(valoresCuentas).reduce((sum, val) => sum + (Number(val) || 0), 0), [valoresCuentas]);
  const salarioNetoDinamico = (empleado?.salario_base ?? 0) - totalAdelantosDinamico - totalCuentasDinamico;

  // Autoselect currency based on payment method
  useEffect(() => {
    const metodo = METODOS_PAGO.find(m => m.value === metodoPago);
    if (metodo) {
      setMonedaPago(metodo.moneda);
    }
  }, [metodoPago]);

  // Calculate conversion
  const conversion = useMemo(() => {
    const neto = salarioNetoDinamico;
    if (monedaPago === 'USD') {
      return { monto: neto, tasa: 1 };
    }
    if (monedaPago === 'BS' && tasa?.tasa_bs_usd) {
      return { monto: neto * tasa.tasa_bs_usd, tasa: tasa.tasa_bs_usd };
    }
    if (monedaPago === 'COP' && tasa?.tasa_cop_usd) {
      return { monto: neto * tasa.tasa_cop_usd, tasa: tasa.tasa_cop_usd };
    }
    return { monto: neto, tasa: 1 };
  }, [salarioNetoDinamico, monedaPago, tasa]);

  const ejecutarConfirmar = (distribucion = null) => {
    onConfirmar({
      empleado_id: empleado?.id,
      empleado_nombre: empleado?.nombre,
      salario_base: empleado?.salario_base ?? 0,
      adelantos_a_descontar: adelantos.map(a => ({
        id: a.id,
        monto_a_descontar: Number(valoresAdelantos[a.id]) || 0,
        monto_pendiente_original: a.monto_pendiente ?? a.monto ?? 0
      })),
      total_adelantos: totalAdelantosDinamico,
      cuentas_a_descontar: cuentas.map(c => ({
        id: c.id,
        monto_a_descontar: Number(valoresCuentas[c.id]) || 0,
        monto_pendiente_original: c.monto_pendiente ?? c.monto ?? 0
      })),
      total_cuentas: totalCuentasDinamico,
      salario_neto: salarioNetoDinamico,
      metodo_pago: metodoPago,
      moneda_pago: monedaPago,
      tasa_cambio: conversion.tasa,
      monto_convertido: conversion.monto,
      periodo_inicio: periodoInicio || null,
      periodo_fin: periodoFin || null,
      notas: notas || null,
      pagos_mixtos: distribucion,
    });
    setMostrarPagoMixto(false);
  };

  const handleConfirmar = () => {
    if (metodoPago === 'mixto') {
      setMostrarPagoMixto(true);
      return;
    }
    ejecutarConfirmar();
  };

  const monedaInfo = MONEDAS[monedaPago] ?? MONEDAS.USD;
  const isNetoNegativo = salarioNetoDinamico < 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl" id="modal-pagar-nomina">
        {/* ─── HEADER ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              Pago de Nómina
            </DialogTitle>
            <DialogDescription className="text-violet-200 mt-1">
              Desglose financiero y confirmación de pago
            </DialogDescription>
          </DialogHeader>

          {/* Employee info */}
          <div className="mt-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-inner">
              {empleado?.nombre?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-bold text-lg">{empleado?.nombre}</p>
              <p className="text-violet-200 text-sm">{empleado?.cargo ?? 'Sin cargo'}</p>
            </div>
          </div>
        </div>

        {/* ─── BODY ────────────────────────────────────────────────── */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* ─── DESGLOSE FINANCIERO ─────────────────────────────── */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Desglose Financiero
            </h3>

            {/* Salario base */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Salario Base</span>
              <span className="font-bold text-gray-900 text-lg">${(empleado?.salario_base ?? 0).toFixed(2)}</span>
            </div>

            {/* Adelantos */}
            {adelantos.length > 0 && (
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Adelantos a descontar ({adelantos.length})
                </p>
                {adelantos.map((a, i) => {
                  const maxVal = a.monto_pendiente ?? a.monto ?? 0;
                  return (
                    <div key={a.id || i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center pl-4 text-sm gap-2">
                      <div className="text-gray-500 truncate max-w-[80%] sm:max-w-[50%] flex flex-col">
                        <span>{a.descripcion || a.empleado || `Adelanto ${i + 1}`}</span>
                        <span className="text-gray-400 text-[10px]">
                          Pendiente: ${maxVal.toFixed(2)} {a.fecha ? `• ${format(new Date(a.fecha), 'dd/MM', { locale: es })}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 self-start sm:self-auto">
                        <span className="text-gray-400 font-medium text-xs">A descontar:</span>
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                          <Input 
                            type="number"
                            min="0"
                            max={maxVal}
                            step="0.01"
                            value={valoresAdelantos[a.id] ?? ''}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (Number(val) > maxVal) val = maxVal;
                              if (Number(val) < 0) val = 0;
                              setValoresAdelantos({...valoresAdelantos, [a.id]: val});
                            }}
                            className="pl-6 h-8 text-xs font-semibold text-right"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pl-4 border-t border-dashed border-gray-200 pt-2">
                  <span className="text-sm font-medium text-gray-600">Total descontado</span>
                  <span className="font-bold text-amber-700">-${totalAdelantosDinamico.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Cuentas por Cobrar (Créditos) */}
            {cuentas.length > 0 && (
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Créditos a descontar ({cuentas.length})
                </p>
                {cuentas.map((c, i) => {
                  const maxVal = c.monto_pendiente ?? c.monto ?? 0;
                  return (
                    <div key={c.id || i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center pl-4 text-sm gap-2">
                      <div className="text-gray-500 truncate max-w-[80%] sm:max-w-[50%] flex flex-col">
                        <span>{c.comanda_numero ? `Comanda #${c.comanda_numero}` : `Crédito ${i + 1}`}</span>
                        <span className="text-gray-400 text-[10px]">
                          Pendiente: ${maxVal.toFixed(2)} {c.fecha_creacion ? `• ${format(new Date(c.fecha_creacion), 'dd/MM', { locale: es })}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 self-start sm:self-auto">
                        <span className="text-gray-400 font-medium text-xs">A descontar:</span>
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                          <Input 
                            type="number"
                            min="0"
                            max={maxVal}
                            step="0.01"
                            value={valoresCuentas[c.id] ?? ''}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (Number(val) > maxVal) val = maxVal;
                              if (Number(val) < 0) val = 0;
                              setValoresCuentas({...valoresCuentas, [c.id]: val});
                            }}
                            className="pl-6 h-8 text-xs font-semibold text-right border-rose-200 focus-visible:ring-rose-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pl-4 border-t border-dashed border-gray-200 pt-2">
                  <span className="text-sm font-medium text-gray-600">Total créditos</span>
                  <span className="font-bold text-rose-700">-${totalCuentasDinamico.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t-2 border-violet-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">NETO A PAGAR</span>
                <span className={`font-black text-2xl ${isNetoNegativo ? 'text-red-600' : 'text-violet-700'}`}>
                  ${salarioNetoDinamico.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {isNetoNegativo && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Saldo negativo</p>
                <p className="text-xs text-red-600">Los adelantos superan el salario base. Revise los montos antes de confirmar.</p>
              </div>
            </div>
          )}

          {/* ─── PERIODO ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Periodo de Pago</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="text-sm"
                  id="periodo-inicio"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={periodoFin}
                  onChange={(e) => setPeriodoFin(e.target.value)}
                  className="text-sm"
                  id="periodo-fin"
                />
              </div>
            </div>
          </div>

          {/* ─── MÉTODO DE PAGO ───────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Método de Pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetodoPago(m.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                    metodoPago === m.value
                      ? 'border-violet-500 bg-violet-50 text-violet-800 shadow-md shadow-violet-100'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                  id={`metodo-${m.value}`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── CONVERSIÓN EN TIEMPO REAL ────────────────────────── */}
          {monedaPago !== 'USD' && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
              <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <RefreshCw className="w-3.5 h-3.5" /> Conversión en Tiempo Real
              </h3>
              <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Monto USD</p>
                  <p className="font-bold text-lg text-gray-900">${salarioNetoDinamico.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-center gap-1 text-violet-400">
                  <ArrowRight className="w-5 h-5" />
                  <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                    ×{conversion.tasa.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Monto {monedaPago}</p>
                  <p className="font-black text-lg text-violet-700">
                    {monedaInfo.simbolo} {conversion.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {tasa && (
                <p className="text-[10px] text-violet-500 mt-2 text-center">
                  Tasa del {tasa.fecha ?? 'hoy'} • {monedaPago === 'BS' ? `1 USD = ${tasa.tasa_bs_usd} Bs` : `1 USD = ${tasa.tasa_cop_usd} COP`}
                </p>
              )}
              {!tasa && (
                <p className="text-[10px] text-amber-600 mt-2 text-center font-medium">
                  ⚠️ No hay tasa de cambio registrada. Configure una en Gestión de Tasas.
                </p>
              )}
            </div>
          )}

          {/* ─── NOTAS ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notas (opcional)</label>
            <Input
              placeholder="Observaciones sobre este pago..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="text-sm"
              id="notas-nomina"
            />
          </div>
        </div>

        {/* ─── FOOTER ──────────────────────────────────────────────── */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isPaying}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={isPaying || isNetoNegativo}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all duration-200 font-bold"
            id="btn-confirmar-pago"
          >
            {isPaying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Pago — {monedaInfo.simbolo}{conversion.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
      
      {/* Modal Pago Mixto */}
      <ModalPagoMixto
        isOpen={mostrarPagoMixto}
        onClose={() => setMostrarPagoMixto(false)}
        totalUSD={salarioNetoDinamico}
        tasaBs={tasa?.tasa_bs_usd}
        onConfirm={ejecutarConfirmar}
        isLoading={isPaying}
      />
    </Dialog>
  );
}
