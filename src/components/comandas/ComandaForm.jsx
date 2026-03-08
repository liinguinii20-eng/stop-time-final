import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, XCircle, Plus, Trash2, Receipt, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ComandaForm({ platos, onSubmit, onCancel, isLoading }) {
  const [mesaNumero, setMesaNumero] = useState("");
  const [notas, setNotas] = useState("");
  const [platoSeleccionado, setPlatoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [notasPlato, setNotasPlato] = useState("");
  const [platosAgregados, setPlatosAgregados] = useState([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState("normal"); // normal, 6, 12

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
      original_plato_nombre: plato.nombre // para referencia
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
      toast.error("Agrega al menos un plato a la comanda");
      return;
    }

    onSubmit({
      comandaData: {
        mesa_numero: mesaNumero,
        notas: notas
      },
      platosSeleccionados: platosAgregados
    });
  };

  const total = platosAgregados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-6">
        <CardTitle className="text-base sm:text-xl flex items-center gap-2">
          <Receipt className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
          <span>Nueva Comanda</span>
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Información de la Mesa */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2">
              📍 Información de la Mesa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mesa">Número de Mesa *</Label>
                <Input
                  id="mesa"
                  value={mesaNumero}
                  onChange={(e) => setMesaNumero(e.target.value)}
                  placeholder="Ej: Mesa 5 o M-5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas Generales</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas opcionales"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Agregar Platos */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2">
              🍽️ Agregar Platos a la Comanda
            </h3>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5 space-y-2">
                    <Label htmlFor="plato">Plato</Label>
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
                                    <span className="ml-2 text-xs text-blue-600">(Por piezas)</span>
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
                    
                    {/* Selector de Variante si aplica */}
                    {platoSeleccionado && platos.find(p => p.id === platoSeleccionado)?.tiene_piezas && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          variant={varianteSeleccionada === "6" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVarianteSeleccionada("6")}
                          className={varianteSeleccionada === "6" ? "bg-blue-600" : ""}
                        >
                          6 Piezas (${platos.find(p => p.id === platoSeleccionado)?.precio_6?.toFixed(2)})
                        </Button>
                        <Button
                          type="button"
                          variant={varianteSeleccionada === "12" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVarianteSeleccionada("12")}
                          className={varianteSeleccionada === "12" ? "bg-blue-600" : ""}
                        >
                          12 Piezas (${platos.find(p => p.id === platoSeleccionado)?.precio_12?.toFixed(2)})
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="cantidad">Cantidad</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor="notasPlato">Notas del Plato</Label>
                    <Input
                      id="notasPlato"
                      value={notasPlato}
                      onChange={(e) => setNotasPlato(e.target.value)}
                      placeholder="Sin cebolla..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAgregarPlato}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Platos Agregados */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700 text-sm sm:text-base">Platos en la Comanda</h4>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  {platosAgregados.length} {platosAgregados.length === 1 ? 'plato' : 'platos'}
                </Badge>
              </div>

              {platosAgregados.length > 0 ? (
                <>
                  {/* Vista móvil */}
                  <div className="block md:hidden space-y-3">
                    {platosAgregados.map((plato, index) => (
                      <div key={index} className="bg-white border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 text-sm truncate">{plato.nombre}</h5>
                            {plato.notas && (
                              <p className="text-xs text-gray-500 italic mt-1">"{plato.notas}"</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarPlato(index)}
                            className="hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{plato.cantidad}x ${plato.precio.toFixed(2)}</span>
                          <span className="font-bold text-amber-600">${(plato.precio * plato.cantidad).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vista desktop */}
                  <div className="hidden md:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Plato</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Notas</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platosAgregados.map((plato, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{plato.nombre}</TableCell>
                            <TableCell>${plato.precio.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold text-amber-600">{plato.cantidad}</TableCell>
                            <TableCell className="text-sm italic text-gray-500">
                              {plato.notas || '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-600">
                              ${(plato.precio * plato.cantidad).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEliminarPlato(index)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total */}
                  <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg font-bold text-gray-900">TOTAL DE LA COMANDA:</span>
                      <span className="text-xl sm:text-2xl font-bold text-amber-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm sm:text-base">No hay platos agregados</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Selecciona platos del menú para agregarlos a la comanda
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 bg-gray-50 p-4 sm:p-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto" 
            disabled={isLoading || platosAgregados.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Guardando..." : `Crear Comanda - $${total.toFixed(2)}`}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}