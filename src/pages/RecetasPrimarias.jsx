import { useState, useMemo } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChefHat, Trash2, Calculator, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import RecetasPrimariasList from "../components/recetas-primarias/RecetasPrimariasList";

// --- COMPONENTE DE FORMULARIO (HIJO) ---
function RecetaPrimariaForm({ receta, ingredientes, detalles, onSubmit, onCancel, isLoading }) {
  const [nombre, setNombre] = useState(receta?.nombre || "");
  const [cantidadResultante, setCantidadResultante] = useState(receta?.cantidad_resultante || 1);
  const [unidadMedida, setUnidadMedida] = useState(receta?.unidad_medida || "kg");
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState(
    detalles.map(d => ({ id: d.ingrediente_id, cantidad: d.cantidad_requerida })) || []
  );

  // Cálculos en tiempo real para la UI
  const costoTotalReceta = ingredientesSeleccionados.reduce((acc, item) => {
    const maestro = ingredientes.find(i => i.id === item.id);
    return acc + (maestro ? maestro.costo_por_unidad * item.cantidad : 0);
  }, 0);

  const costoPorUnidad = cantidadResultante > 0 ? costoTotalReceta / cantidadResultante : 0;

  const handleAddIngrediente = (ingredienteId) => {
    if (!ingredienteId) return;
    if (!ingredientesSeleccionados.find(i => i.id === ingredienteId)) {
      setIngredientesSeleccionados([...ingredientesSeleccionados, { id: ingredienteId, cantidad: 1 }]);
    }
  };

  const handleRemoveIngrediente = (id) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.filter(i => i.id !== id));
  };

  const updateCantidad = (index, valor) => {
    const nuevos = [...ingredientesSeleccionados];
    nuevos[index].cantidad = Number(valor);
    setIngredientesSeleccionados(nuevos);
  };

  return (
    <Card className="p-6 border-amber-200 shadow-xl bg-white mb-8">
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ 
          recetaData: { nombre, cantidad_resultante: cantidadResultante, unidad_medida: unidadMedida, activa: true },
          ingredientesSeleccionados 
        });
      }} className="space-y-6">
        
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-amber-800">
            {receta ? 'Editar Receta' : 'Nueva Receta Base'}
          </h2>
          <Button type="button" variant="ghost" onClick={onCancel}><X className="w-5 h-5"/></Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Nombre</label>
            <Input placeholder="Ej. Salsa Pomodoro" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Rinde (Cant.)</label>
            <Input type="number" step="0.01" value={cantidadResultante} onChange={e => setCantidadResultante(Number(e.target.value))} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Unidad</label>
            <Input placeholder="kg, L, bandeja..." value={unidadMedida} onChange={e => setUnidadMedida(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-gray-700">
              <Calculator className="w-4 h-4" /> Desglose de Costos por Ingrediente
            </h3>
          </div>
          
          <select 
            className="w-full p-2 border rounded-md bg-gray-50"
            onChange={(e) => handleAddIngrediente(e.target.value)}
            value=""
          >
            <option value="">+ Seleccionar ingrediente para añadir...</option>
            {ingredientes.map(ing => (
              <option key={ing.id} value={ing.id}>{ing.nombre} (${ing.costo_por_unidad}/{ing.unidad_medida})</option>
            ))}
          </select>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3 text-left font-bold">Ingrediente</th>
                  <th className="p-3 text-left font-bold">Cantidad</th>
                  <th className="p-3 text-right font-bold">Costo Unit.</th>
                  <th className="p-3 text-right font-bold text-amber-700">Subtotal</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ingredientesSeleccionados.map((item, index) => {
                  const m = ingredientes.find(i => i.id === item.id);
                  const subtotal = m ? m.costo_por_unidad * item.cantidad : 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium">{m?.nombre}</td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          step="0.01"
                          className="w-24 h-9" 
                          value={item.cantidad} 
                          onChange={e => updateCantidad(index, e.target.value)}
                        />
                      </td>
                      <td className="p-3 text-right text-gray-400">
                        ${m?.costo_por_unidad.toFixed(2)} / {m?.unidad_medida}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-600">
                        ${subtotal.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveIngrediente(item.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-amber-50 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-amber-100">
          <div className="text-center md:text-left">
            <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">Costo Total de Insumos</p>
            <p className="text-3xl font-black text-amber-900">${costoTotalReceta.toFixed(2)}</p>
          </div>
          <div className="hidden md:block h-10 w-px bg-amber-200"></div>
          <div className="text-center md:text-right">
            <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">Costo por {unidadMedida}</p>
            <p className="text-3xl font-black text-amber-900">${costoPorUnidad.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700 px-8" disabled={isLoading}>
            {isLoading ? "Procesando..." : (receta ? "Actualizar Receta" : "Crear Receta")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// --- COMPONENTE PRINCIPAL (PADRE) ---
export default function RecetasPrimarias() {
  const [showForm, setShowForm] = useState(false);
  const [editingReceta, setEditingReceta] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Queries
  const { data: recetas = [], isLoading } = useQuery({
    queryKey: ['recetas-primarias'],
    queryFn: () => base44.entities.RecetaPrimaria.list('-created_date', 200),
  });

  const { data: detalles = [] } = useQuery({
    queryKey: ['detalles-recetas-primarias'],
    queryFn: () => base44.entities.DetalleRecetaPrimaria.list('-created_date', 500),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  // Lógica de cálculo unificada para las mutaciones
  const procesarCostos = (recetaData, ingredientesSeleccionados) => {
    const costoTotal = ingredientesSeleccionados.reduce((sum, item) => {
      const m = ingredientes.find(i => i.id === item.id);
      return sum + (m ? m.costo_por_unidad * item.cantidad : 0);
    }, 0);
    const costoPorUnidad = recetaData.cantidad_resultante > 0 ? costoTotal / recetaData.cantidad_resultante : 0;
    return { costoTotal, costoPorUnidad };
  };

  const createMutation = useMutation({
    mutationFn: async ({ recetaData, ingredientesSeleccionados }) => {
      const { costoTotal, costoPorUnidad } = procesarCostos(recetaData, ingredientesSeleccionados);
      const receta = await base44.entities.RecetaPrimaria.create({ ...recetaData, costo_total: costoTotal, costo_por_unidad: costoPorUnidad });
      
      await Promise.all(ingredientesSeleccionados.map(ing => {
        const m = ingredientes.find(i => i.id === ing.id);
        return base44.entities.DetalleRecetaPrimaria.create({
          receta_primaria_id: receta.id,
          ingrediente_id: ing.id,
          ingrediente_nombre: m.nombre,
          cantidad_requerida: ing.cantidad,
          unidad_medida: m.unidad_medida,
          costo_ingrediente: m.costo_por_unidad * ing.cantidad
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas-primarias'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-recetas-primarias'] });
      setShowForm(false);
      toast.success("Receta primaria creada");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, recetaData, ingredientesSeleccionados }) => {
      const { costoTotal, costoPorUnidad } = procesarCostos(recetaData, ingredientesSeleccionados);
      await base44.entities.RecetaPrimaria.update(id, { ...recetaData, costo_total: costoTotal, costo_por_unidad: costoPorUnidad });

      // Limpieza y recreación de detalles (Estrategia Re-sync)
      const antiguos = detalles.filter(d => d.receta_primaria_id === id);
      await Promise.all(antiguos.map(d => base44.entities.DetalleRecetaPrimaria.delete(d.id)));

      await Promise.all(ingredientesSeleccionados.map(ing => {
        const m = ingredientes.find(i => i.id === ing.id);
        return base44.entities.DetalleRecetaPrimaria.create({
          receta_primaria_id: id,
          ingrediente_id: ing.id,
          ingrediente_nombre: m.nombre,
          cantidad_requerida: ing.cantidad,
          unidad_medida: m.unidad_medida,
          costo_ingrediente: m.costo_por_unidad * ing.cantidad
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas-primarias'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-recetas-primarias'] });
      setShowForm(false);
      setEditingReceta(null);
      toast.success("Receta actualizada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const detallesReceta = detalles.filter(d => d.receta_primaria_id === id);
      await Promise.all(detallesReceta.map(d => base44.entities.DetalleRecetaPrimaria.delete(d.id)));
      await base44.entities.RecetaPrimaria.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas-primarias'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-recetas-primarias'] });
      toast.success("Receta eliminada");
    },
  });

  // Otros Handlers
  const handleEdit = (receta) => {
    setEditingReceta(receta);
    setShowForm(true);
  };

  const filteredRecetas = useMemo(() => 
    recetas.filter(r => r.nombre.toLowerCase().includes(searchTerm.toLowerCase())),
    [recetas, searchTerm]
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-amber-600" /> Recetas Primarias
            </h1>
            <p className="text-gray-500">Gestión de costos y preparaciones base</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 w-4 h-4" /> Nueva Receta
            </Button>
          )}
        </div>

        {showForm && (
          <RecetaPrimariaForm
            receta={editingReceta}
            ingredientes={ingredientes}
            detalles={editingReceta ? detalles.filter(d => d.receta_primaria_id === editingReceta.id) : []}
            onSubmit={(data) => editingReceta ? updateMutation.mutate({ id: editingReceta.id, ...data }) : createMutation.mutate(data)}
            onCancel={() => { setShowForm(false); setEditingReceta(null); }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Buscador */}
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                placeholder="Buscar por nombre de receta..." 
                className="pl-10 border-none bg-gray-50 focus-visible:ring-amber-500" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Listado de Recetas */}
        {/* Aquí va tu componente RecetasPrimariasList */}
        <RecetasPrimariasList
          recetas={filteredRecetas}
          detalles={detalles}
          onEdit={handleEdit}
          onDelete={(r) => window.confirm(`¿Eliminar ${r.nombre}?`) && deleteMutation.mutate(r.id)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
