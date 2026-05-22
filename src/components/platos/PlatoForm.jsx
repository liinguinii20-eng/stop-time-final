import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2, ChefHat, Calculator, DollarSign, Utensils, Info, Search } from "lucide-react";
import { toast } from "sonner";

export default function PlatoForm({ plato, ingredientes, recetasPrimarias, recetasSecundarias, platos, onSubmit, onCancel, isLoading }) {
  // --- Local State ---
  const [formData, setFormData] = useState(plato || {
    nombre: "",
    descripcion: "",
    precio: 0,
    categoria: "Entradas",
    activo: true,
    tiene_piezas: false,
    precio_6: 0,
    precio_12: 0,
    permitir_merma: false,
    permitir_credito_empleado: false,
  });

  const [recetas, setRecetas] = useState(() => {
    if (!plato?.recetas) return [];
    // Normalizar recetas del servidor al formato del frontend
    return plato.recetas.map(r => ({
      ingrediente_id: r.ingrediente_id || r.ingredienteId,
      ingrediente_nombre: r.ingrediente_nombre || r.ingredienteNombre || 'Sin nombre',
      tipo: r.tipo || 'ingrediente',
      cantidad_requerida: parseFloat(r.cantidad_requerida || r.cantidadRequerida || r.cantidad) || 0,
      costo_ingrediente: parseFloat(r.costo_ingrediente || r.costoIngrediente) || 0,
      unidad_medida: r.unidad_medida || r.unidadMedida || ''
    }));
  });
  
  // States para el selector de ingredientes
  const [tipoSeleccion, setTipoSeleccion] = useState("ingrediente");
  const [itemId, setItemId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // --- Helpers ---
  const getElementInfo = (id, tipo) => {
    if (tipo === "ingrediente") return ingredientes.find(i => i.id === id);
    if (tipo === "receta_primaria") return recetasPrimarias.find(r => r.id === id);
    if (tipo === "receta_secundaria") return recetasSecundarias.find(r => r.id === id);
    if (tipo === "plato") return platos.find(p => p.id === id);
    return null;
  };

  const handleAddReceta = () => {
    if (!itemId) return toast.error("Selecciona un elemento");
    if (!cantidad || parseFloat(cantidad) <= 0) return toast.error("Ingresa una cantidad válida");
    
    if (recetas.find(r => (r.ingrediente_id || r.id) === itemId)) {
      return toast.error("Este elemento ya está en la receta");
    }

    const info = getElementInfo(itemId, tipoSeleccion);
    const nuevaReceta = {
      ingrediente_id: itemId,
      ingrediente_nombre: info?.nombre || "Desconocido",
      tipo: tipoSeleccion,
      cantidad_requerida: parseFloat(cantidad),
      unidad_medida: info?.unidad_medida || (tipoSeleccion === "plato" ? "und" : ""),
      costo_ingrediente: (info?.costo_por_unidad || info?.costo_total || 0) * parseFloat(cantidad)
    };

    setRecetas([...recetas, nuevaReceta]);
    setItemId("");
    setCantidad("");
    toast.success("Elemento añadido");
  };

  const removeReceta = (id) => {
    setRecetas(recetas.filter(r => (r.ingrediente_id || r.id) !== id));
  };

  // --- Calculations ---
  const totalCosto = useMemo(() => {
    return recetas.reduce((sum, r) => {
      const info = getElementInfo(r.ingrediente_id || r.id, r.tipo);
      const costoUnitario = info?.costo_por_unidad || info?.costo_total || 0;
      return sum + (costoUnitario * r.cantidad_requerida);
    }, 0);
  }, [recetas, ingredientes, recetasPrimarias, recetasSecundarias, platos]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (recetas.length === 0) return toast.error("La receta no puede estar vacía");
    
    onSubmit({ 
      platoData: { ...formData, costo_total: totalCosto, precio_sugerido: totalCosto * 1.7 }, 
      recetas 
    });
  };

  return (
    <Card className="shadow-2xl border-none bg-white rounded-3xl overflow-hidden">
      <CardHeader className="bg-slate-900 text-white p-8">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-black flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-400" />
            {plato ? "Editar Configuración" : "Nuevo Plato Maestro"}
          </CardTitle>
          <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} className="p-8 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Columna Izquierda: Info Básica */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4" /> Datos del Producto
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold ml-1">NOMBRE DEL PLATO</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej: Roll Tempura Especial"
                    className="h-12 text-lg rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-amber-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 font-bold ml-1">CATEGORÍA</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Entradas", "Bebidas", "Stop Premium", "Ramen", "Recetas Virales", "Menú Infantil", "Adicionales", "Rolls Tempura", "Rolls Frescos"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 font-bold ml-1">ESTADO</Label>
                    <div className="flex items-center gap-3 h-12 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                      <Switch checked={formData.activo} onCheckedChange={(v) => setFormData({ ...formData, activo: v })} />
                      <span className="text-sm font-bold text-slate-600">{formData.activo ? "Activo" : "Inactivo"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold ml-1">DESCRIPCIÓN</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalles para el menú digital..."
                    className="rounded-xl border-slate-100 bg-slate-50/50 min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <Label htmlFor="switch-merma" className="text-slate-500 font-bold ml-1 text-[10px] cursor-pointer">PERMITIR COMO MERMA</Label>
                    <div className="flex items-center gap-3 h-12 px-4 bg-red-50/50 rounded-xl border border-red-100">
                      <Switch id="switch-merma" checked={formData.permitir_merma || false} onCheckedChange={(v) => setFormData({ ...formData, permitir_merma: v })} className="data-[state=checked]:bg-red-500" />
                      <Label htmlFor="switch-merma" className="text-xs font-bold text-red-700 cursor-pointer">{formData.permitir_merma ? "Habilitado" : "No"}</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="switch-credito" className="text-slate-500 font-bold ml-1 text-[10px] cursor-pointer">PERMITIR CRÉDITO EMPLEADO</Label>
                    <div className="flex items-center gap-3 h-12 px-4 bg-purple-50/50 rounded-xl border border-purple-100">
                      <Switch id="switch-credito" checked={formData.permitir_credito_empleado || false} onCheckedChange={(v) => setFormData({ ...formData, permitir_credito_empleado: v })} className="data-[state=checked]:bg-purple-500" />
                      <Label htmlFor="switch-credito" className="text-xs font-bold text-purple-700 cursor-pointer">{formData.permitir_credito_empleado ? "Habilitado" : "No"}</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                <Switch checked={formData.tiene_piezas} onCheckedChange={(v) => setFormData({ ...formData, tiene_piezas: v })} />
                <Label className="font-black text-amber-900 cursor-pointer">VENTA POR RACIONES (6/12)</Label>
              </div>

              {formData.tiene_piezas ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-amber-700">6 PIEZAS ($)</Label>
                    <Input type="number" step="0.01" value={formData.precio_6} onChange={(e) => setFormData({ ...formData, precio_6: parseFloat(e.target.value) || 0 })} className="h-12 text-xl font-black rounded-xl bg-white border-amber-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-amber-700">12 PIEZAS ($)</Label>
                    <Input type="number" step="0.01" value={formData.precio_12} onChange={(e) => setFormData({ ...formData, precio_12: parseFloat(e.target.value) || 0 })} className="h-12 text-xl font-black rounded-xl bg-white border-amber-200" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-amber-700">PRECIO DE VENTA ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 w-6 h-6" />
                    <Input type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })} className="h-14 pl-12 text-2xl font-black rounded-2xl bg-white border-amber-200" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Receta */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2">
                <Utensils className="w-4 h-4" /> Composición Técnica
              </h3>

              <div className="bg-slate-900 p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="grid grid-cols-2 gap-3">
                  <Select value={tipoSeleccion} onValueChange={(v) => { setTipoSeleccion(v); setItemId(""); }}>
                    <SelectTrigger className="bg-slate-800 border-none text-white h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingrediente">Ingrediente</SelectItem>
                      <SelectItem value="receta_primaria">Receta Base</SelectItem>
                      <SelectItem value="receta_secundaria">Preparación</SelectItem>
                      <SelectItem value="plato">Otro Plato</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input 
                    type="number" 
                    placeholder="Cant." 
                    value={cantidad} 
                    onChange={e => setCantidad(e.target.value)}
                    className="h-11 rounded-xl bg-slate-800 border-none text-white font-bold"
                  />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder="Buscar elemento..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="h-11 pl-9 rounded-xl bg-slate-800 border-none text-white text-sm"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {(tipoSeleccion === "ingrediente" ? ingredientes : 
                    tipoSeleccion === "receta_primaria" ? recetasPrimarias :
                    tipoSeleccion === "receta_secundaria" ? recetasSecundarias : platos)
                    .filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                    .map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setItemId(item.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex justify-between items-center ${itemId === item.id ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}
                      >
                        <span className="font-bold text-xs truncate mr-2">{item.nombre}</span>
                        <span className="text-[10px] opacity-70">${(item.costo_por_unidad || item.costo_total || 0).toFixed(2)}</span>
                      </button>
                    ))}
                </div>

                <Button type="button" onClick={handleAddReceta} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl">
                  AÑADIR A RECETA
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Item</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Cant.</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Subtotal</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recetas.map((r) => {
                      const id = r.ingrediente_id || r.id;
                      return (
                        <TableRow key={id} className="group hover:bg-slate-50">
                          <TableCell>
                            <p className="font-bold text-slate-700 text-xs">{r.ingrediente_nombre}</p>
                            <Badge variant="outline" className="text-[8px] h-4 uppercase">{r.tipo.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            {r.cantidad_requerida} <span className="text-slate-400 text-[10px]">{r.unidad_medida}</span>
                          </TableCell>
                          <TableCell className="text-right font-black text-indigo-600 text-xs">
                            ${r.costo_ingrediente?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <button type="button" onClick={() => removeReceta(id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Stats de Costo Final */}
              {recetas.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-600 p-4 rounded-2xl text-white">
                    <p className="text-[10px] font-bold uppercase opacity-70">Costo Total</p>
                    <p className="text-2xl font-black">${totalCosto.toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-600 p-4 rounded-2xl text-white">
                    <p className="text-[10px] font-bold uppercase opacity-70">Sugerido (70%)</p>
                    <p className="text-2xl font-black">${(totalCosto * 1.7).toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-8 border-t">
          <p className="text-slate-400 text-sm italic">Recuerda que los cambios afectan el stock en tiempo real.</p>
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onCancel} className="h-14 px-8 rounded-2xl font-bold border-slate-200">
              DESCARTAR
            </Button>
            <Button type="submit" disabled={isLoading} className="h-14 px-12 rounded-2xl font-black bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-300">
              {isLoading ? "GUARDANDO..." : "GUARDAR CONFIGURACIÓN"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}