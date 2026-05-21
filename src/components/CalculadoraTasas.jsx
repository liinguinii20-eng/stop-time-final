import React, { useState, useEffect } from "react";
import { Calculator, DollarSign, RefreshCw, X, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CalculadoraTasas({ collapsed }) {
  const [tasaUSD, setTasaUSD] = useState(null);
  const [tasaCOP, setTasaCOP] = useState(null);

  // Estados de los campos de entrada
  const [usd, setUsd] = useState("");
  const [bs, setBs] = useState("");
  const [cop, setCop] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);

  // Cargar tasas y configurar listeners
  useEffect(() => {
    const cargarTasas = () => {
      const tasaUSDGuardada = localStorage.getItem("tasa_usd_final");
      const tasaCOPGuardada = localStorage.getItem("tasa_cop_actual");

      if (tasaUSDGuardada) {
        setTasaUSD(parseFloat(tasaUSDGuardada));
      } else {
        setTasaUSD(null);
      }

      if (tasaCOPGuardada) {
        setTasaCOP(parseFloat(tasaCOPGuardada));
      } else {
        setTasaCOP(null);
      }
    };

    cargarTasas();

    const handleStorageChange = () => {
      cargarTasas();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("tasasActualizadas", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tasasActualizadas", handleStorageChange);
    };
  }, []);

  // Recalcular conversiones cuando cambian las tasas de cambio
  useEffect(() => {
    if (usd !== "") {
      const num = parseFloat(usd);
      if (!isNaN(num)) {
        setBs(tasaUSD ? (num * tasaUSD).toFixed(2) : "");
        setCop(tasaCOP ? Math.round(num * tasaCOP).toString() : "");
      }
    }
  }, [tasaUSD, tasaCOP]);

  // Manejadores de cambios
  const handleUSDChange = (val) => {
    setUsd(val);
    if (val === "" || isNaN(val)) {
      setBs("");
      setCop("");
      return;
    }
    const num = parseFloat(val);
    setBs(tasaUSD ? (num * tasaUSD).toFixed(2) : "");
    setCop(tasaCOP ? Math.round(num * tasaCOP).toString() : "");
  };

  const handleBsChange = (val) => {
    setBs(val);
    if (val === "" || isNaN(val)) {
      setUsd("");
      setCop("");
      return;
    }
    const num = parseFloat(val);
    const calculatedUsd = tasaUSD ? num / tasaUSD : 0;
    setUsd(calculatedUsd ? calculatedUsd.toFixed(2) : "");
    setCop(tasaCOP && calculatedUsd ? Math.round(calculatedUsd * tasaCOP).toString() : "");
  };

  const handleCopChange = (val) => {
    setCop(val);
    if (val === "" || isNaN(val)) {
      setUsd("");
      setBs("");
      return;
    }
    const num = parseFloat(val);
    const calculatedUsd = tasaCOP ? num / tasaCOP : 0;
    setUsd(calculatedUsd ? calculatedUsd.toFixed(2) : "");
    setBs(tasaUSD && calculatedUsd ? (calculatedUsd * tasaUSD).toFixed(2) : "");
  };

  const limpiarCampos = () => {
    setUsd("");
    setBs("");
    setCop("");
  };

  const tasasDisponibles = tasaUSD || tasaCOP;

  // Renderizar la interfaz de la calculadora (para reutilizar en la versión normal y modal)
  const renderCalculadoraInputs = (isModal = false) => {
    return (
      <div className="space-y-4">
        {/* Indicador de tasas activas */}
        <div className={`p-2.5 rounded-lg border flex flex-col gap-1.5 ${
          isModal 
            ? "bg-slate-50 border-slate-200 text-slate-600 text-xs" 
            : "bg-red-50/40 border-red-100/50 text-slate-500 text-[10px]"
        }`}>
          <div className="font-semibold flex items-center gap-1 text-slate-700">
            <Coins className="w-3.5 h-3.5 text-red-600" />
            Tasas del Sistema:
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <strong>USD:</strong> {tasaUSD ? `Bs. ${tasaUSD.toLocaleString("es-ES", { minimumFractionDigits: 2 })}` : "No disp."}
            </span>
            <span>
              <strong>COP:</strong> {tasaCOP ? `₡ ${tasaCOP.toLocaleString("es-CO")}` : "No disp."}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          {/* Campo USD */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Dólares (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
              <Input
                type="number"
                step="any"
                value={usd}
                onChange={(e) => handleUSDChange(e.target.value)}
                placeholder="0.00"
                className="pl-7 pr-3 h-9 text-sm font-semibold rounded-lg border-slate-200 focus-visible:ring-red-500 focus-visible:ring-offset-0 bg-white"
              />
            </div>
          </div>

          {/* Campo Bs */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Bolívares (Bs)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Bs</span>
              <Input
                type="number"
                step="any"
                value={bs}
                onChange={(e) => handleBsChange(e.target.value)}
                placeholder="0.00"
                className="pl-8 pr-3 h-9 text-sm font-semibold rounded-lg border-slate-200 focus-visible:ring-red-500 focus-visible:ring-offset-0 bg-white"
              />
            </div>
          </div>

          {/* Campo COP */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Pesos (COP)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₡</span>
              <Input
                type="number"
                step="any"
                value={cop}
                onChange={(e) => handleCopChange(e.target.value)}
                placeholder="0"
                className="pl-7 pr-3 h-9 text-sm font-semibold rounded-lg border-slate-200 focus-visible:ring-red-500 focus-visible:ring-offset-0 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Botón de limpiar */}
        {(usd || bs || cop) && (
          <Button
            onClick={limpiarCampos}
            variant="ghost"
            className="w-full h-8 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar calculadora
          </Button>
        )}
      </div>
    );
  };

  // Si no hay tasas registradas, mostrar un aviso sutil si no está colapsado
  if (!tasasDisponibles) {
    if (collapsed) return null;
    return (
      <div className="mx-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-medium">
        ⚠️ No hay tasas de cambio activas cargadas en el sistema.
      </div>
    );
  }

  // Si el sidebar está colapsado, mostrar solo un botón que abre el Dialog
  if (collapsed) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            title="Calculadora de Tasas"
            className="w-10 h-10 p-0 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-700 transition-colors text-slate-500"
          >
            <Calculator className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[360px] p-5 rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3 flex flex-row items-center gap-2.5 space-y-0">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <Calculator className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Calculadora de Tasas
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {renderCalculadoraInputs(true)}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si el sidebar está expandido, mostrar la tarjeta interactiva
  return (
    <div className="mx-2 p-4 bg-white border border-slate-150 rounded-xl shadow-sm hover:shadow transition-all duration-300">
      <div className="flex items-center gap-2 mb-3.5 border-b border-slate-100 pb-2">
        <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center text-red-600">
          <Calculator className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-slate-800">
          Calculadora de Tasas
        </span>
      </div>
      {renderCalculadoraInputs(false)}
    </div>
  );
}
