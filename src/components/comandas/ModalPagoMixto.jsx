import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const metodosPago = {
  usd: [
    { value: "efectivo_usd", label: "💵 Efectivo USD" },
    { value: "binance_usd", label: "📱 Binance" },
    { value: "zinli_usd", label: "📱 Zinli" },
    { value: "paypal_usd", label: "🌐 PayPal" },
    { value: "zelle_usd", label: "🏦 Zelle" }
  ],
  cop: [
    { value: "nequi_cop", label: "📱 Nequi" }
  ],
  ves: [
    { value: "tarjeta_bs", label: "💳 Tarjeta Bs" },
    { value: "pago_movil_bs", label: "📱 Pago Móvil" }
  ]
};

export default function ModalPagoMixto({ isOpen, onClose, totalUSD, tasaBs, onConfirm, isLoading, descuentoPorcentaje = 0 }) {
  // Estados para cada moneda
  const [usd, setUsd] = useState({ metodo: "", monto: "" });
  const [cop, setCop] = useState({ metodo: "", monto: "" });
  const [ves, setVes] = useState({ metodo: "", monto: "" });
  
  const [resumen, setResumen] = useState({
    totalDolares: 0,
    totalBolivaresEquiv: 0,
    totalPesosEquiv: 0,
    totalAsignado: 0,
    faltante: totalUSD
  });

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setUsd({ metodo: "", monto: "" });
      setCop({ metodo: "", monto: "" });
      setVes({ metodo: "", monto: "" });
    }
  }, [isOpen]);

  // Calcular totales cuando cambian los inputs
  useEffect(() => {
    const montoUsd = parseFloat(usd.monto) || 0;
    const montoCop = parseFloat(cop.monto) || 0;
    const montoVes = parseFloat(ves.monto) || 0;

    const usdEquivalenteCop = montoCop / 4000;
    const usdEquivalenteVes = tasaBs ? montoVes / tasaBs : 0;

    const totalAsignado = montoUsd + usdEquivalenteCop + usdEquivalenteVes;
    const faltante = totalUSD - totalAsignado;

    setResumen({
      totalDolares: montoUsd,
      totalBolivaresEquiv: usdEquivalenteVes,
      totalPesosEquiv: usdEquivalenteCop,
      totalAsignado,
      faltante
    });
  }, [usd.monto, cop.monto, ves.monto, totalUSD, tasaBs]);

  const handleConfirmar = () => {
    if (Math.abs(resumen.faltante) > 0.01) {
      toast.error(`El monto debe coincidir con el total. Faltan $${resumen.faltante.toFixed(2)}`);
      return;
    }

    const distribucion = [];

    // USD
    if (parseFloat(usd.monto) > 0) {
      if (!usd.metodo) {
        toast.error("Selecciona el método de pago para USD");
        return;
      }
      distribucion.push({
        metodo_pago: usd.metodo,
        monto_original: parseFloat(usd.monto),
        monto_usd: parseFloat(usd.monto),
        moneda: 'usd',
        tasa_cambio_aplicada: 1
      });
    }

    // COP
    if (parseFloat(cop.monto) > 0) {
      if (!cop.metodo) {
        toast.error("Selecciona el método de pago para COP");
        return;
      }
      distribucion.push({
        metodo_pago: cop.metodo,
        monto_original: parseFloat(cop.monto),
        monto_usd: parseFloat(cop.monto) / 4000,
        moneda: 'cop',
        tasa_cambio_aplicada: 4000
      });
    }

    // VES
    if (parseFloat(ves.monto) > 0) {
      if (!ves.metodo) {
        toast.error("Selecciona el método de pago para Bs");
        return;
      }
      if (!tasaBs) {
        toast.error("No hay tasa de cambio configurada para Bs");
        return;
      }
      distribucion.push({
        metodo_pago: ves.metodo,
        monto_original: parseFloat(ves.monto),
        monto_usd: parseFloat(ves.monto) / tasaBs,
        moneda: 'ves',
        tasa_cambio_aplicada: tasaBs
      });
    }

    if (distribucion.length === 0) {
      toast.error("Debes ingresar al menos un monto");
      return;
    }

    onConfirm(distribucion);
  };

  const esCorrecto = Math.abs(resumen.faltante) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💰 Pago Mixto - Distribuir Monto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total a Pagar */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">TOTAL A PAGAR</p>
            <p className="text-3xl font-bold text-blue-600">${totalUSD.toFixed(2)} USD</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-500 border-b pb-2">--- DISTRIBUIR PAGO ENTRE MONEDAS ---</p>

            {/* USD */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <Label className="text-green-800 font-bold mb-2 block">💵 DÓLARES (USD)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={usd.metodo} 
                  onValueChange={(val) => setUsd({...usd, metodo: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.usd.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-6 bg-white"
                    value={usd.monto}
                    onChange={(e) => setUsd({...usd, monto: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* VES */}
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-amber-800 font-bold">💳 BOLÍVARES (VES)</Label>
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                  Tasa: {tasaBs ? `${tasaBs.toFixed(2)} Bs/$` : 'No definida'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={ves.metodo} 
                  onValueChange={(val) => setVes({...ves, metodo: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.ves.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Bs</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-8 bg-white"
                    value={ves.monto}
                    onChange={(e) => setVes({...ves, monto: e.target.value})}
                  />
                </div>
              </div>
              {parseFloat(ves.monto) > 0 && (
                 <p className="text-xs text-right mt-1 text-amber-600">
                   ≈ ${(parseFloat(ves.monto) / (tasaBs || 1)).toFixed(2)} USD
                 </p>
              )}
            </div>

            {/* COP */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-blue-800 font-bold">🇨🇴 PESOS (COP)</Label>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Tasa: 4000 COP/$
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={cop.metodo} 
                  onValueChange={(val) => setCop({...cop, metodo: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.cop.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₡</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-8 bg-white"
                    value={cop.monto}
                    onChange={(e) => setCop({...cop, monto: e.target.value})}
                  />
                </div>
              </div>
              {parseFloat(cop.monto) > 0 && (
                 <p className="text-xs text-right mt-1 text-blue-600">
                   ≈ ${(parseFloat(cop.monto) / 4000).toFixed(2)} USD
                 </p>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-gray-500">--- RESUMEN ---</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
               <div>💰 USD: ${resumen.totalDolares.toFixed(2)}</div>
               <div>💳 BS: ${resumen.totalBolivaresEquiv.toFixed(2)}</div>
               <div>🇨🇴 COP: ${resumen.totalPesosEquiv.toFixed(2)}</div>
            </div>

            <div className={`rounded-lg p-4 border-2 ${esCorrecto ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold">TOTAL ASIGNADO:</span>
                <span className={`font-bold ${esCorrecto ? 'text-green-600' : 'text-red-600'}`}>
                  ${resumen.totalAsignado.toFixed(2)} / ${totalUSD.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-semibold text-sm">FALTANTE:</span>
                <span className={`font-bold ${esCorrecto ? 'text-green-600' : 'text-red-600'}`}>
                  ${resumen.faltante.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={isLoading || !esCorrecto}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Procesando..." : "✅ Confirmar Pago Mixto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}