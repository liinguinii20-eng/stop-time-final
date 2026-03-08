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
      cantidad: parseInt(cantidad),
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
    <Card className="shadow-lg border-2 border-amber-300">
      <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <span>Comanda {comanda.numero_comanda}</span>
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
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                title="Eliminar comanda"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onCerrar}
              className="self-end sm:self-auto"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Mesa:</span>
            <span className="ml-2 font-semibold text-gray-900">{comanda.mesa_numero}</span>
          </div>
          <div>
            <span className="text-gray-600">Mesero:</span>
            <span className="ml-2 font-semibold text-gray-900">{comanda.mesero_nombre}</span>
          </div>
          <div>
            <span className="text-gray-600">Apertura:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {format(new Date(comanda.fecha_apertura), "HH:mm", { locale: es })}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Agregar Más Platos */}
        {puedeModificar && (
          <div>
            {!mostrarAgregarPlatos ? (
              <Button
                onClick={() => setMostrarAgregarPlatos(true)}
                variant="outline"
                className="w-full border-dashed border-2"
              >
                <Plus className="w-4 h-4 mr-2" />
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
                                      ` - $${plato.precio?.toFixed(2)}`
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
                            6 Piezas (${platos.find(p => p.id === platoSeleccionado)?.precio_6?.toFixed(2)})
                          </Button>
                          <Button
                            type="button"
                            variant={varianteSeleccionada === "12" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setVarianteSeleccionada("12")}
                            className={`flex-1 ${varianteSeleccionada === "12" ? "bg-blue-600" : ""}`}
                          >
                            12 Piezas (${platos.find(p => p.id === platoSeleccionado)?.precio_12?.toFixed(2)})
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
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
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
            Platos de la Comanda
          </h3>
          <div className="space-y-3">
            {detalles.map((detalle) => {
              const config = estadoPlatoConfig[detalle.estado_plato];
              const Icon = config.icon;

              return (
                <div key={detalle.id} className="bg-white border rounded-lg p-3 sm:p-4 space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {detalle.cantidad}x {detalle.plato_nombre}
                      </h4>
                      {detalle.notas_plato && (
                        <p className="text-xs text-gray-500 italic mt-1">"{detalle.notas_plato}"</p>
                      )}
                    </div>
                    <span className="font-bold text-amber-600 text-sm sm:text-base flex-shrink-0">
                      ${detalle.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <Badge className={`${config.color} border flex items-center gap-1`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>

                    {config.siguiente && puedeModificar && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCambiarEstado(detalle.id, detalle.estado_plato)}
                        className="text-xs w-full sm:w-auto"
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
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-bold text-gray-900">TOTAL:</span>
              <span className="text-xl sm:text-2xl font-bold text-amber-600">
                ${subtotalUSD.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Conversiones de Moneda */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 text-center text-sm sm:text-base">?? CONVERSIÓN DE MONEDAS</h3>

            <div className="space-y-3">
              {/* USD */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">DÓLARES (USD)</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  ${totalUSD.toFixed(2)}
                </p>
              </div>

              {/* COP */}
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs text-gray-600 mb-1">PESOS (COP)</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  ¢ {totalCOP.toLocaleString('es-CO')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (Calculado: ${totalUSD.toFixed(2)} × {tasaCOPLocal.toLocaleString('es-CO')})
                </p>
              </div>

              {/* VES */}
              {tasaUSDLocal || tasaActual ? (
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-gray-600 mb-1">BOLÍVARES (VES) {tasaUSDLocal && '- CON RECARGO 16%'}</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">
                    Bs {totalVES.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Calculado: ${totalUSD.toFixed(2)} × {(tasaUSDLocal || tasaActual.tasa_bs_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })})
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">?? No hay tasa configurada para hoy</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Impresión */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setMostrarImprimirCaja(true)}
            variant="outline"
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-2" />
            ?? Imprimir para Caja
          </Button>
          <Button
            onClick={() => setMostrarImprimirCocina(true)}
            variant="outline"
            className="flex-1"
          >
            <ChefHat className="w-4 h-4 mr-2" />
            ?? Imprimir para Cocina
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
                <p className="text-2xl font-bold text-amber-600">${comanda.total_comanda.toFixed(2)}</p>
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
        <CardFooter className="bg-gray-50 p-4 sm:p-6 flex-col space-y-3">
            {!mostrarPago ? (
              <Button
                onClick={() => puedeCerrarFactura ? setMostrarPago(true) : toast.error("?? Solo cajeros y administradores pueden cerrar facturas")}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                disabled={!puedeCerrarFactura}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {puedeCerrarFactura ? "Cerrar y Pagar Comanda" : "?? Solo Cajeros/Admin"}
              </Button>
            ) : (
              <div className="w-full space-y-4">
                {/* Selector de Descuento */}
                <div className="space-y-2">
                  <Label className="font-semibold">?? DESCUENTO</Label>
                  <Select value={descuentoPorcentaje.toString()} onValueChange={(val) => setDescuentoPorcentaje(parseInt(val))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin descuento</SelectItem>
                      <SelectItem value="5">5% de descuento</SelectItem>
                      <SelectItem value="10">10% de descuento</SelectItem>
                      <SelectItem value="15">15% de descuento</SelectItem>
                      <SelectItem value="20">20% de descuento</SelectItem>
                      <SelectItem value="25">25% de descuento</SelectItem>
                      <SelectItem value="30">30% de descuento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conversión Multi-Moneda */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-center">?? TOTAL A PAGAR</h3>

                  <div className="space-y-3">
                    {/* Subtotal y Descuento */}
                    {descuentoPorcentaje > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Subtotal:</span>
                          <span>${subtotalUSD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 mb-1">
                          <span>Descuento ({descuentoPorcentaje}%):</span>
                          <span>-${descuentoMonto.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-blue-600 pt-2 border-t">
                          <span>Total con descuento:</span>
                          <span>${totalUSD.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    {/* USD */}
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">DÓLARES (USD)</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${totalUSD.toFixed(2)}
                      </p>
                    </div>

                    {/* COP */}
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">PESOS (COP)</p>
                      <p className="text-2xl font-bold text-green-600">
                        ¢ {totalCOP.toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Calculado: ${totalUSD.toFixed(2)} × {tasaCOPLocal.toLocaleString('es-CO')})
                      </p>
                    </div>

                    {/* VES */}
                    {tasaUSDLocal || tasaActual ? (
                      <div className="bg-white rounded-lg p-3 border border-amber-200">
                        <p className="text-xs text-gray-600 mb-1">BOLÍVARES (VES) {tasaUSDLocal && '- CON RECARGO 16%'}</p>
                        <p className="text-2xl font-bold text-amber-600">
                          Bs {totalVES.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          (Calculado: ${totalUSD.toFixed(2)} × {(tasaUSDLocal || tasaActual.tasa_bs_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })})
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-700">?? No hay tasa configurada para hoy</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-2">
                  <Label className="font-semibold">?? MÉTODO DE PAGO</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo_usd">?? Efectivo USD</SelectItem>
                      <SelectItem value="binance_usd">?? Binance</SelectItem>
                      <SelectItem value="zinli_usd">?? Zinli</SelectItem>
                      <SelectItem value="paypal_usd">?? PayPal</SelectItem>
                      <SelectItem value="zelle_usd">?? Zelle</SelectItem>
                      <SelectItem value="nequi_cop">?? Nequi</SelectItem>
                      <SelectItem value="tarjeta_bs">?? Tarjeta Bs</SelectItem>
                      <SelectItem value="pago_movil_bs">?? Pago Móvil</SelectItem>
                      <SelectItem value="mixto">?? Pago Mixto</SelectItem>
                      <SelectItem value="cuentas_por_cobrar">?? Cuenta por Cobrar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMostrarPago(false)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePagar}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isLoading || (!tasaUSDLocal && !tasaActual)}
                  >
                    {isLoading ? "Procesando..." : "? CONFIRMAR PAGO"}
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
      )}
    </Card>
  );
}