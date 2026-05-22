import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Receipt, 
  XCircle, 
  CreditCard, 
  Plus, 
  Clock, 
  ChefHat, 
  CheckCircle, 
  Truck,
  Printer,
  Check,
  ChevronsUpDown,
  Trash2
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ModalPagoMixto from "./ModalPagoMixto";
import ComandaPrintView from "./ComandaPrintView";

export default function ComandaDetalle({ 
  comanda, 
  detalles, 
  platos,
  onAgregarPlatos, 
  onActualizarEstado, 
  onCerrarComanda,
  onEliminarComanda,
  onCerrar, 
  isLoading,
  empleado
}) {
  const [mostrarAgregarPlatos, setMostrarAgregarPlatos] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo_usd");
  const [tasaActual, setTasaActual] = useState(null);
  const [mostrarPagoMixto, setMostrarPagoMixto] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [tasaCOPLocal, setTasaCOPLocal] = useState(4000);
  const [tasaUSDLocal, setTasaUSDLocal] = useState(null);
  
  const [platoSeleccionado, setPlatoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [notasPlato, setNotasPlato] = useState("");
  const [varianteSeleccionada, setVarianteSeleccionada] = useState("normal");
  const [openCombobox, setOpenCombobox] = useState(false);
  const [mostrarImprimirCaja, setMostrarImprimirCaja] = useState(false);
  const [mostrarImprimirCocina, setMostrarImprimirCocina] = useState(false);
  const [mostrarFormularioCuenta, setMostrarFormularioCuenta] = useState(false);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notasCuenta, setNotasCuenta] = useState("");

  // Obtener tasa de cambio actual
  const { data: tasas = [] } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 5),
    enabled: mostrarPago
  });

  React.useEffect(() => {
    if (tasas.length > 0) {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const tasaHoy = tasas.find(t => t.fecha === hoy && t.activa);
      setTasaActual(tasaHoy || tasas[0]);
    }
  }, [tasas]);

  // Cargar y sincronizar tasas
  React.useEffect(() => {
    const cargarTasas = () => {
      const tasaCOP = localStorage.getItem('tasa_cop_actual');
      if (tasaCOP) {
        setTasaCOPLocal(parseFloat(tasaCOP));
      }

      const tasaUSD = localStorage.getItem('tasa_usd_final');
      if (tasaUSD) {
        setTasaUSDLocal(parseFloat(tasaUSD));
      }
    };

    cargarTasas();

    const handleTasasActualizadas = () => {
      cargarTasas();
    };

    window.addEventListener('tasasActualizadas', handleTasasActualizadas);
    return () => window.removeEventListener('tasasActualizadas', handleTasasActualizadas);
  }, []);

  const estadoPlatoConfig = {
    pendiente: { 
      icon: Clock, 
      color: "bg-gray-100 text-gray-800 border-gray-200", 
      label: "Pendiente",
      siguiente: "en_preparacion"
    },
    en_preparacion: { 
      icon: ChefHat, 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      label: "En Preparación",
      siguiente: "listo"
    },
    listo: { 
      icon: CheckCircle, 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      label: "Listo",
      siguiente: "entregado"
    },
    entregado: { 
      icon: Truck, 
      color: "bg-green-100 text-green-800 border-green-200", 
      label: "Entregado",
      siguiente: null
    }
  };

  const handleAgregarPlatosNuevos = () => {
    if (!platoSeleccionado) {
      toast.error("Selecciona un plato");
      return;
    }

    const plato = platos.find(p => p.id === platoSeleccionado);
    if (!plato) return;

    let precioFinal = plato.precio;
    let nombreFinal = plato.nombre;
    let variante = null;

    if (plato.tiene_piezas) {
      if (varianteSeleccionada === "6") {
        precioFinal = plato.precio_6;
        nombreFinal = `${plato.nombre} (6 piezas)`;
        variante = "6 piezas";
      } else if (varianteSeleccionada === "12") {
        precioFinal = plato.precio_12;
        nombreFinal = `${plato.nombre} (12 piezas)`;
        variante = "12 piezas";
      } else {
        toast.error("Selecciona 6 o 12 piezas");
        return;
      }
    }

    const platosNuevos = [{
      id: plato.id,
      nombre: nombreFinal,
      precio: precioFinal,
      cantidad: parseFloat(cantidad) || 0,
      notas: notasPlato,
      variante: variante
    }];

    onAgregarPlatos(comanda.id, platosNuevos);
    setPlatoSeleccionado("");
    setVarianteSeleccionada("normal");
    setCantidad(1);
    setNotasPlato("");
    setMostrarAgregarPlatos(false);
  };

  const handleCambiarEstado = (detalleId, estadoActual) => {
    const config = estadoPlatoConfig[estadoActual];
    if (config.siguiente) {
      onActualizarEstado({ detalleId, nuevoEstado: config.siguiente });
    }
  };

  const handlePagar = () => {
    if (!tasaUSDLocal && !tasaActual) {
      toast.error("?? No hay tasa de cambio USD configurada");
      return;
    }

    if (metodoPago === "mixto") {
      setMostrarPagoMixto(true);
      return;
    }

    if (metodoPago === "cuentas_por_cobrar") {
      setMostrarFormularioCuenta(true);
      return;
    }

    onCerrarComanda({ 
      comandaId: comanda.id, 
      metodoPago,
      tasaBs: tasaUSDLocal || tasaActual.tasa_bs_usd,
      pagosMixtos: null,
      datosCuenta: null,
      descuentoPorcentaje: descuentoPorcentaje,
      descuentoMonto: descuentoMonto
    });
    setMostrarPago(false);
  };

  const handleConfirmarCuentaPorCobrar = () => {
    if (!clienteNombre.trim()) {
      toast.error("Ingresa el nombre del cliente");
      return;
    }

    onCerrarComanda({
      comandaId: comanda.id,
      metodoPago: "cuentas_por_cobrar",
      tasaBs: tasaUSDLocal || tasaActual.tasa_bs_usd,
      pagosMixtos: null,
      datosCuenta: {
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        fecha_vencimiento: fechaVencimiento || null,
        notas: notasCuenta
      },
      descuentoPorcentaje: descuentoPorcentaje,
      descuentoMonto: descuentoMonto
    });
    setMostrarFormularioCuenta(false);
    setMostrarPago(false);
  };

  const handleConfirmarPagoMixto = (pagosMixtos) => {
    onCerrarComanda({
      comandaId: comanda.id,
      metodoPago: "mixto",
      tasaBs: tasaUSDLocal || tasaActual.tasa_bs_usd,
      pagosMixtos,
      descuentoPorcentaje: descuentoPorcentaje,
      descuentoMonto: descuentoMonto
    });
    setMostrarPagoMixto(false);
    setMostrarPago(false);
  };

  // Cálculos de conversión con descuento
  const subtotalUSD = comanda.total_comanda;
  const descuentoMonto = subtotalUSD * (descuentoPorcentaje / 100);
  const totalUSD = subtotalUSD - descuentoMonto;
  const totalCOP = totalUSD * tasaCOPLocal; // Usar tasa COP configurable
  const totalVES = tasaUSDLocal ? totalUSD * tasaUSDLocal : (tasaActual ? totalUSD * tasaActual.tasa_bs_usd : 0); // Usar tasa USD configurable con +16%

  const puedeModificar = comanda.estado === 'abierta';
  const puedePagar = comanda.estado === 'abierta' || comanda.estado === 'cerrada';
  const esAdministrador = empleado?.rol === 'administrador';
  const esMesero = empleado?.rol === 'mesero';
  const puedeCerrarFactura = esAdministrador || empleado?.rol === 'cajero';

  return (
    <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="bg-gradient-to-br from-slate-50 to-amber-50/10 p-8 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Receipt className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <span>Detalle de Comanda {comanda.numero_comanda}</span>
          </CardTitle>
          <div className="flex gap-2">
            {esAdministrador && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (window.confirm(`¿Eliminar la comanda ${comanda.numero_comanda}? Esta acción no se puede deshacer.`)) {
                    onEliminarComanda(comanda.id);
                  }
                }}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 rounded-xl"
                title="Eliminar comanda"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onCerrar}
              className="self-end sm:self-auto rounded-xl"
            >
              <XCircle className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mesa</span>
            <span className="font-extrabold text-slate-800 bg-slate-100/50 px-3 py-1 rounded-xl">Mesa {comanda.mesa_numero}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mesero</span>
            <span className="font-semibold text-slate-700 bg-slate-100/50 px-3 py-1 rounded-xl truncate max-w-[180px]">{comanda.mesero_nombre}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Apertura</span>
            <span className="font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-xl">
              {format(new Date(comanda.fecha_apertura), "HH:mm", { locale: es })} hs
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        {/* Agregar Más Platos */}
        {puedeModificar && (
          <div>
            {!mostrarAgregarPlatos ? (
              <Button
                onClick={() => setMostrarAgregarPlatos(true)}
                variant="outline"
                className="w-full h-14 rounded-2xl border-dashed border-2 border-slate-200 hover:bg-slate-50 text-slate-500 font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Agregar Más Platos
              </Button>
            ) : (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5 space-y-2">
                      <Label>Plato</Label>
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full justify-between bg-white"
                          >
                            {platoSeleccionado
                              ? platos.find((plato) => plato.id === platoSeleccionado)?.nombre
                              : "Buscar y seleccionar plato..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar plato..." />
                            <CommandList>
                              <CommandEmpty>No se encontró el plato.</CommandEmpty>
                              <CommandGroup>
                                {platos.map((plato) => (
                                  <CommandItem
                                    key={plato.id}
                                    value={plato.nombre}
                                    onSelect={() => {
                                      setPlatoSeleccionado(plato.id);
                                      setVarianteSeleccionada(plato.tiene_piezas ? "12" : "normal");
                                      setOpenCombobox(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        platoSeleccionado === plato.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {plato.nombre}
                                    {plato.tiene_piezas ? (
                                      <span className="ml-2 text-xs text-blue-600">(Piezas)</span>
                                    ) : (
                                      ` - ${(plato.precio ?? 0).toFixed(2)}`
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {platoSeleccionado && platos.find(p => p.id === platoSeleccionado)?.tiene_piezas && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant={varianteSeleccionada === "6" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setVarianteSeleccionada("6")}
                            className={`flex-1 ${varianteSeleccionada === "6" ? "bg-blue-600" : ""}`}
                          >
                            6 Piezas (${(platos.find(p => p.id === platoSeleccionado)?.precio_6 ?? 0).toFixed(2)})
                          </Button>
                          <Button
                            type="button"
                            variant={varianteSeleccionada === "12" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setVarianteSeleccionada("12")}
                            className={`flex-1 ${varianteSeleccionada === "12" ? "bg-blue-600" : ""}`}
                          >
                            12 Piezas (${(platos.find(p => p.id === platoSeleccionado)?.precio_12 ?? 0).toFixed(2)})
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-2">
                      <Label>Notas</Label>
                      <Input
                        value={notasPlato}
                        onChange={(e) => setNotasPlato(e.target.value)}
                        placeholder="Sin cebolla..."
                      />
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMostrarAgregarPlatos(false)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAgregarPlatosNuevos}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Lista de Platos */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-700 text-sm sm:text-base border-b border-slate-100 pb-2">
            Platos de la Comanda
          </h3>
          <div className="space-y-3">
            {detalles.map((detalle) => {
              const estado = detalle.estado_plato || 'pendiente';
              const config = estadoPlatoConfig[estado] || estadoPlatoConfig['pendiente'];
              const Icon = config.icon;

              return (
                <div key={detalle.id} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-base truncate">
                        {detalle.cantidad}x {detalle.plato_nombre}
                      </h4>
                      {detalle.notas_plato && (
                        <p className="text-xs text-amber-800 font-medium italic mt-2 bg-amber-50/50 p-2.5 rounded-xl border-l-2 border-amber-400">"{detalle.notas_plato}"</p>
                      )}
                    </div>
                    <span className="font-black text-amber-600 text-lg flex-shrink-0">
                      ${(detalle.subtotal ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100/50">
                    <Badge className={`${config.color} border px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5`}>
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </Badge>

                    {config.siguiente && puedeModificar && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCambiarEstado(detalle.id, detalle.estado_plato)}
                        className="text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-100 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                      >
                        Marcar como {estadoPlatoConfig[config.siguiente].label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total y Conversiones */}
        <div className="space-y-6 pt-4 border-t border-slate-100">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-lg shadow-slate-900/20">
            <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
              <Receipt className="w-32 h-32" />
            </div>
            <div className="flex justify-between items-center relative z-10">
              <span className="text-sm font-bold uppercase tracking-wider opacity-60">TOTAL DE LA COMANDA</span>
              <span className="text-3xl font-black tracking-tight">${(subtotalUSD ?? 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Conversiones de Moneda */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Conversión de Monedas</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* USD */}
              <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4 flex flex-col justify-between">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Dólares (USD)</p>
                <p className="text-2xl font-black text-slate-800">${totalUSD.toFixed(2)}</p>
              </div>

              {/* COP */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-[1.5rem] p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-blue-600/80 font-bold uppercase mb-1">Pesos (COP)</p>
                  <p className="text-2xl font-black text-blue-700">₡ {totalCOP.toLocaleString('es-CO')}</p>
                </div>
                <p className="text-[9px] text-blue-500 font-bold mt-2">
                  Tasa: 1 USD = ₡ {tasaCOPLocal.toLocaleString('es-CO')}
                </p>
              </div>

              {/* VES */}
              {tasaUSDLocal || tasaActual ? (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-600/80 font-bold uppercase mb-1">
                      Bolívares (VES) {tasaUSDLocal && '16% Recargo'}
                    </p>
                    <p className="text-2xl font-black text-emerald-700">
                      Bs {totalVES.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className="text-[9px] text-emerald-500 font-bold mt-2">
                    Tasa: 1 USD = Bs {(tasaUSDLocal || tasaActual.tasa_bs_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-[1.5rem] p-4 flex items-center justify-center">
                  <p className="text-xs font-bold text-red-700 text-center">Tasa Bs no configurada</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Impresión */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            onClick={() => setMostrarImprimirCaja(true)}
            variant="outline"
            className="flex-1 h-14 rounded-2xl font-bold border-slate-200 hover:bg-slate-100"
          >
            <Printer className="w-5 h-5 mr-2 text-slate-500" />
            Imprimir para Caja
          </Button>
          <Button
            onClick={() => setMostrarImprimirCocina(true)}
            variant="outline"
            className="flex-1 h-14 rounded-2xl font-bold border-slate-200 hover:bg-slate-100"
          >
            <ChefHat className="w-5 h-5 mr-2 text-slate-500" />
            Imprimir para Cocina
          </Button>
        </div>

        {/* Modales de Impresión */}
        <ComandaPrintView
          isOpen={mostrarImprimirCaja}
          onClose={() => setMostrarImprimirCaja(false)}
          comanda={comanda}
          detalles={detalles}
          tipo="caja"
        />
        <ComandaPrintView
          isOpen={mostrarImprimirCocina}
          onClose={() => setMostrarImprimirCocina(false)}
          comanda={comanda}
          detalles={detalles}
          tipo="cocina"
        />

        {/* Modal Pago Mixto */}
        <ModalPagoMixto
          isOpen={mostrarPagoMixto}
          onClose={() => setMostrarPagoMixto(false)}
          totalUSD={totalUSD}
          tasaBs={tasaActual?.tasa_bs_usd}
          onConfirm={handleConfirmarPagoMixto}
          isLoading={isLoading}
        />

        {/* Modal Cuenta por Cobrar */}
        <Dialog open={mostrarFormularioCuenta} onOpenChange={setMostrarFormularioCuenta}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Cuenta por Cobrar</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm text-gray-600">Monto de la Comanda</p>
                <p className="text-2xl font-bold text-amber-600">${(comanda.total_comanda ?? 0).toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_nombre">Nombre del Cliente *</Label>
                <Input
                  id="cliente_nombre"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre completo del cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_telefono">Teléfono</Label>
                <Input
                  id="cliente_telefono"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Teléfono de contacto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento (Opcional)</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas_cuenta">Notas</Label>
                <Textarea
                  id="notas_cuenta"
                  value={notasCuenta}
                  onChange={(e) => setNotasCuenta(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMostrarFormularioCuenta(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarCuentaPorCobrar}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={isLoading}
              >
                {isLoading ? "Procesando..." : "Crear Cuenta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>

      {/* Footer con Botón de Pago */}
      {puedePagar && (
        <CardFooter className="bg-slate-50 p-8 flex-col space-y-6 rounded-b-[2.5rem] border-t border-slate-100">
            {!mostrarPago ? (
              <Button
                onClick={() => puedeCerrarFactura ? setMostrarPago(true) : toast.error("⚠️ Solo cajeros y administradores pueden cerrar facturas")}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-200/50 hover:scale-[1.02] active:scale-95 transition-all"
                size="lg"
                disabled={!puedeCerrarFactura}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {puedeCerrarFactura ? "Cerrar y Pagar Comanda" : "⚠️ Solo Cajeros/Admin"}
              </Button>
            ) : (
              <div className="w-full space-y-6">
                {/* Selector de Descuento */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">🏷️ Descuento</Label>
                  <Select value={descuentoPorcentaje.toString()} onValueChange={(val) => setDescuentoPorcentaje(parseInt(val))}>
                    <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="font-semibold">Sin descuento</SelectItem>
                      <SelectItem value="5" className="font-semibold">5% de descuento</SelectItem>
                      <SelectItem value="10" className="font-semibold">10% de descuento</SelectItem>
                      <SelectItem value="15" className="font-semibold">15% de descuento</SelectItem>
                      <SelectItem value="20" className="font-semibold">20% de descuento</SelectItem>
                      <SelectItem value="25" className="font-semibold">25% de descuento</SelectItem>
                      <SelectItem value="30" className="font-semibold">30% de descuento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conversión Multi-Moneda */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center border-b pb-3 mb-2">Total a Recibir</h3>

                  <div className="space-y-4">
                    {/* Subtotal y Descuento */}
                    {descuentoPorcentaje > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-400">
                          <span>SUBTOTAL:</span>
                          <span>${subtotalUSD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-green-600">
                          <span>DESCUENTO ({descuentoPorcentaje}%):</span>
                          <span>-${descuentoMonto.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-slate-800 pt-2 border-t border-slate-200/50">
                          <span>TOTAL:</span>
                          <span>${totalUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Grid de importes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* USD */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Dólares (USD)</p>
                        <p className="text-xl font-black text-slate-800">${totalUSD.toFixed(2)}</p>
                      </div>

                      {/* COP */}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-blue-600/80 font-bold uppercase mb-1">Pesos (COP)</p>
                          <p className="text-xl font-black text-blue-700">₡ {totalCOP.toLocaleString('es-CO')}</p>
                        </div>
                        <p className="text-[9px] text-blue-500 font-bold mt-2">
                          Tasa: {tasaCOPLocal.toLocaleString('es-CO')}
                        </p>
                      </div>

                      {/* VES */}
                      {tasaUSDLocal || tasaActual ? (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] text-emerald-600/80 font-bold uppercase mb-1">Bolívares (VES)</p>
                            <p className="text-xl font-black text-emerald-700">
                              Bs {totalVES.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <p className="text-[9px] text-emerald-500 font-bold mt-2">
                            Tasa: Bs {(tasaUSDLocal || tasaActual.tasa_bs_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-center">
                          <p className="text-xs font-bold text-red-700">Tasa Bs no configurada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">💵 Método de Pago</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-semibold text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo_usd" className="font-semibold">💵 Efectivo USD</SelectItem>
                      <SelectItem value="binance_usd" className="font-semibold">🪙 Binance</SelectItem>
                      <SelectItem value="zinli_usd" className="font-semibold">📱 Zinli</SelectItem>
                      <SelectItem value="paypal_usd" className="font-semibold">💳 PayPal</SelectItem>
                      <SelectItem value="zelle_usd" className="font-semibold">⚡ Zelle</SelectItem>
                      <SelectItem value="nequi_cop" className="font-semibold">📱 Nequi</SelectItem>
                      <SelectItem value="efectivo_cop" className="font-semibold">💵 Efectivo COP</SelectItem>
                      <SelectItem value="tarjeta_bs" className="font-semibold">💳 Tarjeta Bs</SelectItem>
                      <SelectItem value="pago_movil_bs" className="font-semibold">📱 Pago Móvil</SelectItem>
                      <SelectItem value="mixto" className="font-semibold">🔀 Pago Mixto</SelectItem>
                      <SelectItem value="cuentas_por_cobrar" className="font-semibold">📂 Cuenta por Cobrar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setMostrarPago(false)}
                    className="flex-1 h-14 rounded-2xl font-bold border-slate-200"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePagar}
                    className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-200/50 hover:scale-[1.02] active:scale-95 transition-all"
                    disabled={isLoading || (!tasaUSDLocal && !tasaActual)}
                  >
                    {isLoading ? "Procesando..." : "Confirmar Pago"}
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
      )}
    </Card>
  );
}