import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, XCircle, Plus, Trash2, ChefHat, Calculator, DollarSign, Utensils, Info, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function PlatoForm({ plato, ingredientes, recetasPrimarias, recetasSecundarias, recetasExistentes, onSubmit, onCancel, isLoading, platos = [] }) {
  const [formData, setFormData] = useState(plato || {
    nombre: "",
    descripcion: "",
    precio: 0,
    categoria: "Entradas",
    activo: true,
    tiene_piezas: false,
    precio_6: 0,
    precio_12: 0
  });

  const [ingredientesReceta, setIngredientesReceta] = useState([]);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState("");
  const [cantidadRequerida, setCantidadRequerida] = useState("");
  const [tipoSeleccion, setTipoSeleccion] = useState("ingrediente");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (recetasExistentes && recetasExistentes.length > 0) {
      const recetasFormateadas = recetasExistentes.map(receta => {
        const ingrediente = ingredientes.find(i => i.id === receta.ingrediente_id);
        return {
          ingrediente_id: receta.ingrediente_id,
          ingrediente_nombre: ingrediente?.nombre || receta.ingrediente_nombre || "Desconocido",
          cantidad_requerida: receta.cantidad_requerida,
          unidad_medida: ingrediente?.unidad_medida || "unidad",
          receta_id: receta.id,
          tipo: receta.tipo || "ingrediente" // Aseguramos que el tipo exista al cargar
        };
      });
      setIngredientesReceta(recetasFormateadas);
    }
  }, [recetasExistentes, ingredientes]);

  const handleAgregarIngrediente = () => {
    if (!ingredienteSeleccionado) {
      toast.error(tipoSeleccion === "ingrediente" ? "Selecciona un ingrediente" : "Selecciona una receta");
      return;
    }
    if (!cantidadRequerida || parseFloat(cantidadRequerida) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }
    const yaExiste = ingredientesReceta.find(i => i.ingrediente_id === ingredienteSeleccionado);
    if (yaExiste) {
      toast.error("Este elemento ya está en la receta");
      return;
    }

    let nuevoItem = null;
    if (tipoSeleccion === "ingrediente") {
      const ing = ingredientes.find(i => i.id === ingredienteSeleccionado);
      nuevoItem = { ingrediente_id: ing.id, ingrediente_nombre: ing.nombre, cantidad_requerida: parseFloat(cantidadRequerida), unidad_medida: ing.unidad_medida, tipo: "ingrediente" };
    } else if (tipoSeleccion === "receta_primaria") {
      const rec = recetasPrimarias.find(r => r.id === ingredienteSeleccionado);
      nuevoItem = { ingrediente_id: rec.id, ingrediente_nombre: rec.nombre, cantidad_requerida: parseFloat(cantidadRequerida), unidad_medida: rec.unidad_medida, tipo: "receta_primaria" };
    } else if (tipoSeleccion === "receta_secundaria") {
      const rec = recetasSecundarias.find(r => r.id === ingredienteSeleccionado);
      nuevoItem = { ingrediente_id: rec.id, ingrediente_nombre: rec.nombre, cantidad_requerida: parseFloat(cantidadRequerida), unidad_medida: rec.unidad_medida, tipo: "receta_secundaria" };
    } else {
      const p = platos.find(pl => pl.id === ingredienteSeleccionado);
      nuevoItem = { ingrediente_id: p.id, ingrediente_nombre: p.nombre, cantidad_requerida: parseFloat(cantidadRequerida), unidad_medida: "unidad", tipo: "plato" };
    }

    if (nuevoItem) {
      setIngredientesReceta([...ingredientesReceta, nuevoItem]);
      toast.success("Agregado correctamente");
      setIngredienteSeleccionado("");
      setCantidadRequerida("");
    }
  };

  const handleEliminarIngrediente = (ingrediente_id) => {
    setIngredientesReceta(ingredientesReceta.filter(i => i.ingrediente_id !== ingrediente_id));
    toast.success("Eliminado");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ingredientesReceta.length === 0) {
      toast.error("Agrega al menos un ingrediente");
      return;
    }
    onSubmit({ platoData: formData, ingredientesReceta });
  };

  const costoTotalPlato = useMemo(() => {
    return ingredientesReceta.reduce((total, item) => {
      let costoUnitario = 0;
      if (item.tipo === "ingrediente") costoUnitario = ingredientes.find(i => i.id === item.ingrediente_id)?.costo_por_unidad || 0;
      else if (item.tipo === "receta_primaria") costoUnitario = recetasPrimarias.find(r => r.id === item.ingrediente_id)?.costo_por_unidad || 0;
      else if (item.tipo === "receta_secundaria") costoUnitario = recetasSecundarias.find(r => r.id === item.ingrediente_id)?.costo_por_unidad || 0;
      else if (item.tipo === "plato") costoUnitario = platos.find(pl => pl.id === item.ingrediente_id)?.costo_total || 0;
      return total + (costoUnitario * item.cantidad_requerida);
    }, 0);
  }, [ingredientesReceta, ingredientes, recetasPrimarias, recetasSecundarias, platos]);

  const precioSugerido = costoTotalPlato * 1.7;
  const margenActual = formData.precio > 0 ? ((formData.precio - costoTotalPlato) / formData.precio * 100) : 0;

  return (
    <Card className="shadow-2xl border-none overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl flex items-center gap-3 font-bold">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            {plato ? "Gestión de Plato y Receta" : "Crear Nuevo Plato"}
          </CardTitle>
          <Badge variant="secondary" className="bg-white/20 text-white border-none px-3 py-1">
            Menú Digital
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="p-8 space-y-10">
          
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2">
              <Info className="w-4 h-4" /> Información General
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold text-gray-500">NOMBRE DEL PLATO</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  placeholder="Ej: Roll Tempura Especial"
                  className="h-12 text-lg border-gray-200 focus:ring-indigo-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500">CATEGORÍA</Label>
                <Select value={formData.categoria} onValueChange={(val) => setFormData({ ...formData, categoria: val })}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Entradas", "Bebidas", "Stop Premium", "Ramen", "Recetas Virales", "Menú Infantil", "Adicionales", "Rolls Tempura", "Rolls Frescos"].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label className="text-xs font-bold text-gray-500">DESCRIPCIÓN DEL PLATO</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe los sabores, texturas o ingredientes clave..."
                  className="rounded-xl border-gray-200 min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.tiene_piezas}
                  onCheckedChange={(checked) => setFormData({ ...formData, tiene_piezas: checked })}
                />
                <Label className="font-bold text-slate-700 cursor-pointer">Venta por Raciones / Piezas</Label>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-bold text-slate-500">ESTADO ACTIVO</Label>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
              </div>
            </div>

            {formData.tiene_piezas ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-indigo-600">PRECIO 6 PIEZAS ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precio_6}
                    onChange={(e) => setFormData({ ...formData, precio_6: parseFloat(e.target.value) || 0 })}
                    className="h-12 text-xl font-bold rounded-xl border-indigo-100 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-indigo-600">PRECIO 12 PIEZAS ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precio_12}
                    onChange={(e) => setFormData({ ...formData, precio_12: parseFloat(e.target.value) || 0 })}
                    className="h-12 text-xl font-bold rounded-xl border-indigo-100 bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-xs space-y-2">
                <Label className="text-xs font-bold text-indigo-600">PRECIO DE VENTA UNITARIO ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                    className="h-12 pl-10 text-xl font-bold rounded-xl border-indigo-100 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Composición de la Receta
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-[10px] font-bold text-indigo-400 uppercase">Origen</Label>
                <Select value={tipoSeleccion} onValueChange={(val) => { setTipoSeleccion(val); setIngredienteSeleccionado(""); }}>
                  <SelectTrigger className="bg-white rounded-lg h-11 border-indigo-100 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingrediente">Ingrediente</SelectItem>
                    <SelectItem value="receta_primaria">Receta 1°</SelectItem>
                    <SelectItem value="receta_secundaria">Receta 2°</SelectItem>
                    <SelectItem value="plato">Plato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-5 space-y-1.5">
                <Label className="text-[10px] font-bold text-indigo-400 uppercase">Elemento</Label>
                <Select value={ingredienteSeleccionado} onValueChange={setIngredienteSeleccionado}>
                  <SelectTrigger className="bg-white rounded-lg h-11 border-indigo-100 shadow-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-2 sticky top-0 bg-white z-10 border-b">
                      <Input placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="h-8 text-xs" />
                    </div>
                    {tipoSeleccion === "ingrediente" && ingredientes.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(i => <SelectItem key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</SelectItem>)}
                    {tipoSeleccion === "receta_primaria" && recetasPrimarias.filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    {tipoSeleccion === "receta_secundaria" && recetasSecundarias.filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    {tipoSeleccion === "plato" && platos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-bold text-indigo-400 uppercase">Cantidad</Label>
                <Input type="number" value={cantidadRequerida} onChange={(e) => setCantidadRequerida(e.target.value)} placeholder="0.00" className="h-11 rounded-lg border-indigo-100 bg-white" />
              </div>

              <div className="md:col-span-2">
                <Button type="button" onClick={handleAgregarIngrediente} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200">
                  <Plus className="w-4 h-4 mr-2" /> Agregar
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase text-gray-500">Tipo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-gray-500">Descripción</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-gray-500">Cant.</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-gray-500">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientesReceta.map((item) => (
                    <TableRow key={item.ingrediente_id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">
                          {/* CORRECCIÓN APLICADA AQUÍ */}
                          {(item.tipo || "ingrediente").replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-700">{item.ingrediente_nombre}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.cantidad_requerida} <span className="text-gray-400 text-xs">{item.unidad_medida}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">
                        ${(() => {
                          let costoUnitario = 0;
                          if (item.tipo === "ingrediente") {
                            costoUnitario = ingredientes.find(i => i.id === item.ingrediente_id)?.costo_por_unidad || 0;
                          } else if (item.tipo === "receta_primaria") {
                            costoUnitario = recetasPrimarias.find(r => r.id === item.ingrediente_id)?.costo_por_unidad || 0;
                          } else if (item.tipo === "receta_secundaria") {
                            costoUnitario = recetasSecundarias.find(r => r.id === item.ingrediente_id)?.costo_por_unidad || 0;
                          } else if (item.tipo === "plato") {
                            costoUnitario = platos.find(pl => pl.id === item.ingrediente_id)?.costo_total || 0;
                          }
                          return (costoUnitario * item.cantidad_requerida).toFixed(2);
                        })()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEliminarIngrediente(item.ingrediente_id)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {ingredientesReceta.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 flex flex-col justify-between">
                  <div className="flex items-center gap-2 opacity-80 mb-2">
                    <Calculator className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Costo Producción</span>
                  </div>
                  <p className="text-4xl font-black">${costoTotalPlato.toFixed(2)}</p>
                </div>

                <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-200 flex flex-col justify-between">
                  <div className="flex items-center gap-2 opacity-80 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Precio Sugerido (70%)</span>
                  </div>
                  <p className="text-4xl font-black">${precioSugerido.toFixed(2)}</p>
                </div>

                <div className={`${margenActual >= 50 ? 'bg-violet-600' : 'bg-orange-500'} rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between transition-colors`}>
                  <div className="flex items-center gap-2 opacity-80 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Margen Bruto</span>
                  </div>
                  <p className="text-4xl font-black">{margenActual.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-500 font-bold hover:bg-slate-200">
            <XCircle className="w-4 h-4 mr-2" /> DESCARTAR
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || ingredientesReceta.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-indigo-200"
          >
            <Save className="w-5 h-5 mr-2" />
            {isLoading ? "GUARDANDO..." : "FINALIZAR PLATO"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}