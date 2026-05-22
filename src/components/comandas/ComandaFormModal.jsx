import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, XCircle, Plus, Trash2, Receipt, Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ComandaFormModal({ open, platos, onSubmit, onCancel, isLoading }) {
  const [mesaNumero, setMesaNumero] = useState("");
  const [notas, setNotas] = useState("");
  const [platoSeleccionado, setPlatoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [notasPlato, setNotasPlato] = useState("");
  const [platosAgregados, setPlatosAgregados] = useState([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState("normal");

  const handleAgregarPlato = () => {
    if (!platoSeleccionado) {
      toast.error("Selecciona un plato");
      return;
    }

    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
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

    const nuevoPlato = {
      id: plato.id,
      nombre: nombreFinal,
      precio: precioFinal,
      cantidad: parseFloat(cantidad) || 0,
      notas: notasPlato,
      variante: variante,
      original_plato_nombre: plato.nombre
    };

    setPlatosAgregados([...platosAgregados, nuevoPlato]);
    setPlatoSeleccionado("");
    setVarianteSeleccionada("normal");
    setCantidad(1);
    setNotasPlato("");
    toast.success(`${nombreFinal} agregado`);
  };

  const handleEliminarPlato = (index) => {
    setPlatosAgregados(platosAgregados.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!mesaNumero.trim()) {
      toast.error("Ingresa el número de mesa");
      return;
    }

    if (platosAgregados.length === 0) {
      toast.error("Agrega al menos un plato");
      return;
    }

    onSubmit({
      comandaData: {
        mesa_numero: mesaNumero,
        notas: notas
      },
      platosSeleccionados: platosAgregados
    });

    // Reset form
    setMesaNumero("");
    setNotas("");
    setPlatosAgregados([]);
  };

  const total = platosAgregados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden border-0 shadow-2xl rounded-[2.5rem] bg-white">
        <DialogHeader className="bg-gradient-to-br from-slate-950 to-slate-850 p-8 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Receipt className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Nueva Comanda</DialogTitle>
                <p className="text-slate-400 text-xs mt-1 font-medium">Crear orden de servicio para mesa</p>
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 border-0 font-bold px-3 py-1 rounded-full text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Nuevo
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-140px)]">
          <div className="p-8 space-y-8 overflow-y-auto">
            {/* Información de la Mesa */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                📍 Mesa & Notas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Número de Mesa *</Label>
                  <Input
                    value={mesaNumero}
                    onChange={(e) => setMesaNumero(e.target.value)}
                    placeholder="Ej: Mesa 5 o M-5"
                    required
                    className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas Generales</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Notas opcionales para cocina"
                    className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Agregar Platos */}
            <div className="space-y-6 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 pb-1">
                🍽️ Platos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-amber-50/20 p-6 rounded-[2rem] border border-amber-50">
                <div className="md:col-span-5 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Seleccionar Plato</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-14 justify-between bg-white border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        <span className="truncate">
                          {platoSeleccionado
                            ? platos.find((plato) => plato.id === platoSeleccionado)?.nombre
                            : "Buscar plato..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar..." />
                        <CommandList>
                          <CommandEmpty>No encontrado</CommandEmpty>
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
                                className="py-3 px-4 font-semibold text-slate-700 cursor-pointer"
                              >
                                <Check className={cn("mr-2 h-4 w-4 text-amber-500", platoSeleccionado === plato.id ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1">{plato.nombre}</span>
                                {plato.tiene_piezas ? (
                                  <Badge className="ml-2 bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 font-bold">Por piezas</Badge>
                                ) : (
                                  <span className="font-extrabold text-amber-600">${(plato.precio ?? 0).toFixed(2)}</span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {platoSeleccionado && platos.find(p => p.id === platoSeleccionado)?.tiene_piezas && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        variant={varianteSeleccionada === "6" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVarianteSeleccionada("6")}
                        className={cn(
                          "rounded-xl font-bold h-10 px-4",
                          varianteSeleccionada === "6" ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-200"
                        )}
                      >
                        6 Piezas (${(platos.find(p => p.id === platoSeleccionado)?.precio_6 ?? 0).toFixed(2)})
                      </Button>
                      <Button
                        type="button"
                        variant={varianteSeleccionada === "12" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVarianteSeleccionada("12")}
                        className={cn(
                          "rounded-xl font-bold h-10 px-4",
                          varianteSeleccionada === "12" ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-200"
                        )}
                      >
                        12 Piezas (${(platos.find(p => p.id === platoSeleccionado)?.precio_12 ?? 0).toFixed(2)})
                      </Button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Cantidad</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="h-14 bg-white border-slate-200 rounded-2xl text-sm font-semibold text-center focus-visible:ring-amber-500"
                  />
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas</Label>
                  <Input
                    value={notasPlato}
                    onChange={(e) => setNotasPlato(e.target.value)}
                    placeholder="Sin cebolla..."
                    className="h-14 bg-white border-slate-200 rounded-2xl text-sm font-semibold focus-visible:ring-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAgregarPlato}
                    className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold shadow-lg shadow-amber-200/50 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>

              {platosAgregados.length > 0 ? (
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-100">
                        <TableHead className="font-bold text-slate-400 py-4 pl-6">Plato</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 text-right">Precio</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 text-right">Cantidad</TableHead>
                        <TableHead className="font-bold text-slate-400 py-4 text-right">Subtotal</TableHead>
                        <TableHead className="w-16 py-4 pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platosAgregados.map((plato, index) => (
                        <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-100/30 transition-colors">
                          <TableCell className="font-bold text-slate-800 py-4 pl-6">{plato.nombre}</TableCell>
                          <TableCell className="text-right font-medium text-slate-500 py-4">${(plato.precio ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-extrabold text-amber-600 py-4">{plato.cantidad}</TableCell>
                          <TableCell className="text-right font-black text-slate-800 py-4">${(plato.precio * plato.cantidad).toFixed(2)}</TableCell>
                          <TableCell className="py-4 pr-6 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarPlato(index)}
                              className="hover:bg-red-50 hover:text-red-600 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold text-lg">No hay platos agregados</p>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                    Selecciona platos del menú para agregarlos a la comanda
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TOTAL</span>
              <span className="text-3xl font-black text-slate-800">${total.toFixed(2)}</span>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="h-14 rounded-2xl px-6 font-bold border-slate-200"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || platosAgregados.length === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-14 px-8 font-bold shadow-lg shadow-amber-200/50 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isLoading ? "Creando..." : "Crear Comanda"}
                <Save className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}