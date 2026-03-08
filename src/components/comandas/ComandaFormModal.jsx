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
      cantidad: parseInt(cantidad),
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Receipt className="w-7 h-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Nueva Comanda</DialogTitle>
                <p className="text-amber-100 text-sm mt-1">Crear orden para mesa</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-none">
              <Sparkles className="w-3 h-3 mr-1" /> Nuevo
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Número de Mesa</Label>
                <Input
                  value={mesaNumero}
                  onChange={(e) => setMesaNumero(e.target.value)}
                  placeholder="Ej: Mesa 5 o M-5"
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Notas Generales</Label>
                <Input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas opcionales"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider">Agregar Platos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-amber-50 p-4 rounded-xl border border-amber-100">
                <div className="md:col-span-5 space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-amber-600">Plato</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-white h-11 rounded-xl"
                      >
                        {platoSeleccionado
                          ? platos.find((plato) => plato.id === platoSeleccionado)?.nombre
                          : "Buscar plato..."}
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
                              >
                                <Check className={cn("mr-2 h-4 w-4", platoSeleccionado === plato.id ? "opacity-100" : "opacity-0")} />
                                {plato.nombre}
                                {plato.tiene_piezas ? <span className="ml-2 text-xs text-amber-600">(Piezas)</span> : ` - $${plato.precio?.toFixed(2)}`}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {platoSeleccionado && platos.find(p => p.id === platoSeleccionado)?.tiene_piezas && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={varianteSeleccionada === "6" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVarianteSeleccionada("6")}
                        className={varianteSeleccionada === "6" ? "bg-amber-600" : ""}
                      >
                        6 (${platos.find(p => p.id === platoSeleccionado)?.precio_6?.toFixed(2)})
                      </Button>
                      <Button
                        type="button"
                        variant={varianteSeleccionada === "12" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVarianteSeleccionada("12")}
                        className={varianteSeleccionada === "12" ? "bg-amber-600" : ""}
                      >
                        12 (${platos.find(p => p.id === platoSeleccionado)?.precio_12?.toFixed(2)})
                      </Button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-amber-600">Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-amber-600">Notas</Label>
                  <Input
                    value={notasPlato}
                    onChange={(e) => setNotasPlato(e.target.value)}
                    placeholder="Sin cebolla..."
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAgregarPlato}
                    className="w-full bg-amber-600 hover:bg-amber-700 h-11 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>

              {platosAgregados.length > 0 ? (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-[10px] font-black uppercase">Plato</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Precio</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Cant.</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platosAgregados.map((plato, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-semibold">{plato.nombre}</TableCell>
                          <TableCell className="text-right">${plato.precio.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-amber-600">{plato.cantidad}</TableCell>
                          <TableCell className="text-right font-bold">${(plato.precio * plato.cantidad).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarPlato(index)}
                              className="h-8 w-8 text-red-400 hover:text-red-600"
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
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-gray-400">No hay platos agregados</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50 border-t flex flex-row items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total</p>
              <p className="text-3xl font-black text-amber-600">${total.toFixed(2)}</p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
                className="px-8"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || platosAgregados.length === 0}
                className="bg-amber-600 hover:bg-amber-700 px-10 h-11 rounded-xl font-bold shadow-lg shadow-amber-200"
              >
                {isLoading ? "Creando..." : "Crear Comanda"}
                <Save className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}