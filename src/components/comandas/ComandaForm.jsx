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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ComandaForm({ platos, empleados = [], onSubmit, onCancel, isLoading }) {
  const [tipoMovimiento, setTipoMovimiento] = useState("VENTA");
  const [motivoMerma, setMotivoMerma] = useState("");
  const [empleadoCredito, setEmpleadoCredito] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const [mesaNumero, setMesaNumero] = useState("");
  const [notas, setNotas] = useState("");
  const [platoSeleccionado, setPlatoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [notasPlato, setNotasPlato] = useState("");
  const [platosAgregados, setPlatosAgregados] = useState([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState("normal"); // normal, 6, 12

  const platosDisponibles = platos.filter(p => {
    if (tipoMovimiento === 'MERMA') return p.permitir_merma;
    if (tipoMovimiento === 'CREDITO_EMPLEADO') return p.permitir_credito_empleado;
    return true; // VENTA
  });

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

    if (tipoMovimiento === 'VENTA' && !mesaNumero.trim()) {
      toast.error("Ingresa el número de mesa");
      return;
    }
    
    if (tipoMovimiento === 'CREDITO_EMPLEADO' && !empleadoCredito) {
      toast.error("Selecciona un empleado para el crédito");
      return;
    }

    if (platosAgregados.length === 0) {
      toast.error("Agrega al menos un plato a la comanda");
      return;
    }
    
    if (tipoMovimiento !== 'VENTA') {
      setShowPasswordModal(true);
      return;
    }

    procesarEnvio();
  };

  const procesarEnvio = (password = "") => {
    const empleadoObj = empleados.find(e => e.id === empleadoCredito);
    onSubmit({
      comandaData: {
        mesa_numero: tipoMovimiento === 'VENTA' ? mesaNumero : 'N/A',
        notas: notas,
        tipo_movimiento: tipoMovimiento,
        empleado_id: tipoMovimiento === 'CREDITO_EMPLEADO' ? empleadoCredito : null,
        empleado_nombre: tipoMovimiento === 'CREDITO_EMPLEADO' ? empleadoObj?.nombre : null,
        motivo_merma: tipoMovimiento === 'MERMA' ? motivoMerma : null,
        admin_password: password
      },
      platosSeleccionados: platosAgregados
    });
  };

  const total = platosAgregados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-br from-slate-50 to-amber-50/10 p-8 border-b border-slate-100">
        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Receipt className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <span>Nueva Comanda</span>
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-8 space-y-8">
          {/* Modo de Operación */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>⚙️</span> Modo de Operación
            </h3>
            <div className="flex flex-wrap gap-4">
              {['VENTA', 'MERMA', 'CREDITO_EMPLEADO'].map(modo => (
                <Button
                  key={modo}
                  type="button"
                  variant={tipoMovimiento === modo ? "default" : "outline"}
                  onClick={() => {
                    setTipoMovimiento(modo);
                    setPlatosAgregados([]); // Resetear platos al cambiar modo
                    setPlatoSeleccionado("");
                  }}
                  className={cn(
                    "rounded-2xl h-12 px-6 font-bold transition-all",
                    tipoMovimiento === modo && modo === 'VENTA' && "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200",
                    tipoMovimiento === modo && modo === 'MERMA' && "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200",
                    tipoMovimiento === modo && modo === 'CREDITO_EMPLEADO' && "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
                  )}
                >
                  {modo === 'VENTA' ? 'Venta Normal' : modo === 'MERMA' ? 'Merma (Dañado)' : 'Crédito a Empleado'}
                </Button>
              ))}
            </div>
          </div>

          {/* Información de la Mesa / Detalles */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>📍</span> Detalles de la {tipoMovimiento === 'VENTA' ? 'Mesa' : 'Operación'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tipoMovimiento === 'VENTA' && (
                <div className="space-y-2">
                  <Label htmlFor="mesa" className="text-xs font-bold uppercase tracking-wider text-slate-400">Número de Mesa *</Label>
                  <Input
                    id="mesa"
                    value={mesaNumero}
                    onChange={(e) => setMesaNumero(e.target.value)}
                    placeholder="Ej: Mesa 5 o M-5"
                    required
                    className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-amber-500"
                  />
                </div>
              )}
              {tipoMovimiento === 'MERMA' && (
                <div className="space-y-2">
                  <Label htmlFor="motivo" className="text-xs font-bold uppercase tracking-wider text-slate-400">Motivo de Merma</Label>
                  <Input
                    id="motivo"
                    value={motivoMerma}
                    onChange={(e) => setMotivoMerma(e.target.value)}
                    placeholder="Ej: Plato se cayó, receta mala..."
                    className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-red-500"
                  />
                </div>
              )}
              {tipoMovimiento === 'CREDITO_EMPLEADO' && (
                <div className="space-y-2">
                  <Label htmlFor="empleado" className="text-xs font-bold uppercase tracking-wider text-slate-400">Empleado *</Label>
                  <select
                    id="empleado"
                    value={empleadoCredito}
                    onChange={(e) => setEmpleadoCredito(e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold px-4 focus:outline-none focus:ring-2 focus:ring-purple-500/20 appearance-none text-slate-700"
                  >
                    <option value="">Selecciona un empleado...</option>
                    {empleados.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notas" className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas Generales</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas opcionales para la comanda"
                  rows={2}
                  className="bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-amber-500 p-4 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Agregar Platos */}
          <div className="space-y-6 border-t border-slate-100 pt-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>🍽️</span> Agregar Platos a la Comanda
            </h3>
            
            <Card className="border-0 bg-amber-50/20 rounded-[2rem] overflow-hidden">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                  <div className="md:col-span-5 space-y-2">
                    <Label htmlFor="plato" className="text-xs font-bold uppercase tracking-wider text-slate-400">Plato</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full h-14 justify-between bg-white border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 shadow-sm"
                        >
                          <span className="truncate">
                            {platoSeleccionado
                              ? platos.find((plato) => plato.id === platoSeleccionado)?.nombre
                              : "Buscar y seleccionar plato..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar plato..." />
                          <CommandList>
                            <CommandEmpty>No se encontró el plato.</CommandEmpty>
                            <CommandGroup>
                              {platosDisponibles.map((plato) => (
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
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 text-amber-500",
                                      platoSeleccionado === plato.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
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
                    
                    {/* Selector de Variante si aplica */}
                    {platoSeleccionado && platos.find(p => p.id === platoSeleccionado)?.tiene_piezas && (
                      <div className="mt-3 flex gap-2">
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
                    <Label htmlFor="cantidad" className="text-xs font-bold uppercase tracking-wider text-slate-400">Cantidad</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      min="0"
                      step="any"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      className="h-14 bg-white border-slate-200 rounded-2xl text-sm font-semibold text-center focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="notasPlato" className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas del Plato</Label>
                    <Input
                      id="notasPlato"
                      value={notasPlato}
                      onChange={(e) => setNotasPlato(e.target.value)}
                      placeholder="Sin cebolla, bien cocido..."
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
              </CardContent>
            </Card>

            {/* Lista de Platos Agregados */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-700 text-sm sm:text-base">Platos en la Comanda</h4>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-3 py-1 rounded-full">
                  {platosAgregados.length} {platosAgregados.length === 1 ? 'plato' : 'platos'}
                </Badge>
              </div>

              {platosAgregados.length > 0 ? (
                <>
                  {/* Vista móvil */}
                  <div className="block md:hidden space-y-3">
                    {platosAgregados.map((plato, index) => (
                      <div key={index} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-slate-800 text-sm truncate">{plato.nombre}</h5>
                            {plato.notas && (
                              <p className="text-xs text-amber-700 font-medium italic mt-1.5 bg-amber-50/50 p-2 rounded-xl border-l-2 border-amber-400">"{plato.notas}"</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarPlato(index)}
                            className="hover:bg-red-50 hover:text-red-600 rounded-xl flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">${(plato.cantidad ?? 0)}x ${(plato.precio ?? 0).toFixed(2)}</span>
                          <span className="font-black text-amber-600">${((plato.precio ?? 0) * (plato.cantidad ?? 0)).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vista desktop */}
                  <div className="hidden md:block border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-100">
                          <TableHead className="font-bold text-slate-400 py-4 pl-6">Plato</TableHead>
                          <TableHead className="font-bold text-slate-400 py-4">Precio</TableHead>
                          <TableHead className="font-bold text-slate-400 py-4">Cantidad</TableHead>
                          <TableHead className="font-bold text-slate-400 py-4">Notas</TableHead>
                          <TableHead className="text-right font-bold text-slate-400 py-4">Subtotal</TableHead>
                          <TableHead className="text-right font-bold text-slate-400 py-4 pr-6">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platosAgregados.map((plato, index) => (
                          <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-100/30 transition-colors">
                            <TableCell className="font-bold text-slate-800 py-4 pl-6">{plato.nombre}</TableCell>
                            <TableCell className="font-medium text-slate-500">${(plato.precio ?? 0).toFixed(2)}</TableCell>
                            <TableCell className="font-extrabold text-amber-600">{plato.cantidad}</TableCell>
                            <TableCell className="text-sm font-semibold italic text-slate-500">
                              {plato.notas ? (
                                <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-xl text-xs">{plato.notas}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-800">
                              ${((plato.precio ?? 0) * (plato.cantidad ?? 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right py-4 pr-6">
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

                  {/* Total */}
                  <div className="mt-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-lg shadow-slate-900/20">
                    <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
                      <Receipt className="w-32 h-32" />
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-sm font-bold uppercase tracking-wider opacity-60">TOTAL DE LA COMANDA</span>
                      <span className="text-3xl font-black tracking-tight">${(total ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </>
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
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 bg-slate-50 p-8 border-t border-slate-100">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isLoading}
            className="w-full sm:w-auto h-14 rounded-2xl px-6 font-bold border-slate-200"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-14 px-8 font-bold shadow-lg shadow-amber-200/50 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto" 
            disabled={isLoading || platosAgregados.length === 0}
          >
            <Save className="w-5 h-5 mr-2" />
            {isLoading ? "Guardando..." : `Crear Comanda - $${total.toFixed(2)}`}
          </Button>
        </CardFooter>
      </form>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Se requiere Autorización</DialogTitle>
            <DialogDescription>
              Ingresa la contraseña de administrador para procesar esta {tipoMovimiento === 'MERMA' ? 'Merma' : 'cuenta de Crédito'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin_password">Contraseña de Administrador</Label>
              <Input
                id="admin_password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="h-14 rounded-2xl"
                placeholder="******"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} className="rounded-xl h-12">Cancelar</Button>
            <Button 
              type="button" 
              onClick={() => {
                setShowPasswordModal(false);
                procesarEnvio(adminPassword);
                setAdminPassword("");
              }}
              className="rounded-xl h-12 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Autorizar y Procesar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}