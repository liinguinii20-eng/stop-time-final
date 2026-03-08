import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, XCircle, Plus, Trash2, ChefHat, Calculator, Layers, Notebook } from "lucide-react";
import { toast } from "sonner";

export default function RecetaSecundariaForm({ receta, ingredientes, recetasPrimarias, detalles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(receta || {
    nombre: "",
    descripcion: "",
    unidad_medida: "kg",
    cantidad_resultante: 1,
    tiempo_preparacion: 0,
    instrucciones: "",
    activa: true
  });

  const [tipoElemento, setTipoElemento] = useState("ingrediente");
  const [elementoSeleccionado, setElementoSeleccionado] = useState("");
  const [cantidadElemento, setCantidadElemento] = useState("");
  
  const [elementosAgregados, setElementosAgregados] = useState(
    detalles.map(d => ({
      id: d.elemento_id,
      nombre: d.elemento_nombre,
      cantidad: d.cantidad_requerida,
      unidad: d.unidad_medida,
      tipo: d.tipo_elemento
    }))
  );

  // --- HANDLERS ---
  const handleAgregarElemento = () => {
    if (!elementoSeleccionado) {
      toast.error("Selecciona un elemento");
      return;
    }

    if (!cantidadElemento || parseFloat(cantidadElemento) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    const elemento = tipoElemento === "ingrediente"
      ? ingredientes.find(i => i.id === elementoSeleccionado)
      : recetasPrimarias.find(r => r.id === elementoSeleccionado);

    if (!elemento) return;

    setElementosAgregados([...elementosAgregados, {
      id: elemento.id,
      nombre: elemento.nombre,
      cantidad: parseFloat(cantidadElemento),
      unidad: elemento.unidad_medida,
      tipo: tipoElemento
    }]);

    setElementoSeleccionado("");
    setCantidadElemento("");
    toast.success("Elemento añadido");
  };

  const handleEliminarElemento = (index) => {
    setElementosAgregados(elementosAgregados.filter((_, i) => i !== index));
  };

  // Función para actualizar la cantidad directamente en la tabla
  const updateCantidadEnTabla = (index, nuevaCantidad) => {
    const nuevosElementos = [...elementosAgregados];
    nuevosElementos[index].cantidad = parseFloat(nuevaCantidad) || 0;
    setElementosAgregados(nuevosElementos);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (elementosAgregados.length === 0) {
      toast.error("Agrega al menos un elemento");
      return;
    }
    onSubmit({
      recetaData: formData,
      elementosSeleccionados: elementosAgregados
    });
  };

  // --- CÁLCULOS DINÁMICOS ---
  const { costoTotal, costoPorUnidad } = useMemo(() => {
    const total = elementosAgregados.reduce((sum, elem) => {
      const maestro = elem.tipo === "ingrediente" 
        ? ingredientes.find(i => i.id === elem.id)
        : recetasPrimarias.find(r => r.id === elem.id);
      return sum + (maestro ? maestro.costo_por_unidad * elem.cantidad : 0);
    }, 0);
    const porUnidad = formData.cantidad_resultante > 0 ? total / formData.cantidad_resultante : 0;
    return { costoTotal: total, costoPorUnidad: porUnidad };
  }, [elementosAgregados, ingredientes, recetasPrimarias, formData.cantidad_resultante]);

  const elementosDisponibles = tipoElemento === "ingrediente"
    ? ingredientes.filter(ing => !elementosAgregados.some(a => a.id === ing.id && a.tipo === "ingrediente"))
    : recetasPrimarias.filter(rec => !elementosAgregados.some(a => a.id === rec.id && a.tipo === "receta_primaria"));

  return (
    <Card className="shadow-2xl border-purple-100 overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl flex items-center gap-3 font-bold">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            {receta ? "Editar Receta Secundaria" : "Nueva Creación de Chef"}
          </CardTitle>
          <Badge variant="secondary" className="bg-white/20 text-white border-none px-3 py-1">
            Modo Edición Avanzada
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} className="p-0">
        <CardContent className="p-8 space-y-8">
          
          {/* SECCIÓN 1: IDENTIDAD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Nombre de la Preparación</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Mousse de Chocolate Amargo"
                required
                className="h-12 text-lg border-gray-200 focus:ring-purple-500 focus:border-purple-500 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Tiempo de Prep (Min)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.tiempo_preparacion}
                  onChange={(e) => setFormData({ ...formData, tiempo_preparacion: parseInt(e.target.value) || 0 })}
                  className="h-12 pl-10 rounded-xl"
                />
                <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: RENDIMIENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-purple-700">Rendimiento Total (Cantidad)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cantidad_resultante}
                onChange={(e) => setFormData({ ...formData, cantidad_resultante: parseFloat(e.target.value) || 1 })}
                required
                className="bg-white rounded-lg font-bold text-purple-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-purple-700">Unidad de Medida Final</Label>
              <Select
                value={formData.unidad_medida}
                onValueChange={(val) => setFormData({ ...formData, unidad_medida: val })}
              >
                <SelectTrigger className="bg-white rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["kg", "g", "l", "ml", "unidad", "porcion"].map(u => (
                    <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <Notebook className="w-4 h-4" /> Instrucciones del Chef
            </Label>
            <Textarea
              value={formData.instrucciones}
              onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
              placeholder="Escribe el paso a paso de la preparación..."
              className="min-h-[100px] rounded-xl border-gray-200"
            />
          </div>

          {/* SECCIÓN 3: COMPOSICIÓN DINÁMICA */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" /> Estructura de Costos
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-purple-50 p-4 rounded-xl border border-purple-100 items-end">
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-purple-600">Tipo de Insumo</Label>
                <Select value={tipoElemento} onValueChange={(val) => { setTipoElemento(val); setElementoSeleccionado(""); }}>
                  <SelectTrigger className="bg-white border-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingrediente">Ingrediente Directo</SelectItem>
                    <SelectItem value="receta_primaria">Receta de Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-5 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-purple-600">Seleccionar Elemento</Label>
                <Select value={elementoSeleccionado} onValueChange={setElementoSeleccionado}>
                  <SelectTrigger className="bg-white border-purple-200">
                    <SelectValue placeholder="Buscar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {elementosDisponibles.map(elem => (
                      <SelectItem key={elem.id} value={elem.id}>{elem.nombre} ({elem.unidad_medida})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-purple-600">Cantidad</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cantidadElemento}
                  onChange={(e) => setCantidadElemento(e.target.value)}
                  className="bg-white border-purple-200"
                  placeholder="0.00"
                />
              </div>

              <Button
                type="button"
                onClick={handleAgregarElemento}
                className="md:col-span-2 bg-purple-600 hover:bg-purple-700 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" /> Añadir
              </Button>
            </div>

            {/* TABLA ESTILIZADA */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">Origen</TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">Insumo / Receta</TableHead>
                    <TableHead className="text-center font-bold text-[11px] uppercase tracking-wider w-32">Cant. Requerida</TableHead>
                    <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider">Costo Unit.</TableHead>
                    <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-purple-700">Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elementosAgregados.map((elem, index) => {
                    const maestro = elem.tipo === "ingrediente" 
                      ? ingredientes.find(i => i.id === elem.id)
                      : recetasPrimarias.find(r => r.id === elem.id);
                    const subtotal = (maestro?.costo_por_unidad || 0) * elem.cantidad;
                    
                    return (
                      <TableRow key={index} className="hover:bg-purple-50/30 group">
                        <TableCell>
                          <Badge className={elem.tipo === "receta_primaria" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}>
                            {elem.tipo === "receta_primaria" ? "Base" : "Insumo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">{elem.nombre}</TableCell>
                        <TableCell className="text-center">
                          <Input 
                           type="number" 
                            step="0.01"
                            className="w-24 h-8 mx-auto text-center font-bold border-gray-200 focus:ring-purple-500"
                            // El || "" evita que el input muestre 0 cuando el usuario quiere borrar
                            value={elem.cantidad === 0 ? "" : elem.cantidad}
                            onChange={(e) => updateCantidadEnTabla(index, e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right text-gray-500 font-mono">${maestro?.costo_por_unidad.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-black text-purple-600 font-mono">${subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEliminarElemento(index)} className="opacity-0 group-hover:opacity-100 text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* DASHBOARD DE COSTOS TOTALES */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl text-white shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-700">
                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Calculator className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Costo Total Insumos</span>
                  </div>
                  <span className="text-5xl font-black">${costoTotal.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-center md:items-end pt-6 md:pt-0">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Costo x {formData.unidad_medida}</span>
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <span className="text-5xl font-black text-green-400">${costoPorUnidad.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 bg-gray-50/50 p-6 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-gray-500 px-8 hover:bg-gray-100">
            <XCircle className="w-4 h-4 mr-2" /> Descartar
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 px-12 h-12 rounded-xl font-bold shadow-lg shadow-purple-200 transition-all active:scale-95" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Receta Maestro"}
            <Save className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
