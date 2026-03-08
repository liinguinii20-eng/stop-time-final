import { useState, useMemo, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UtensilsCrossed, TrendingUp, DollarSign, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PlatoForm from "../components/platos/PlatoForm";
import PlatosList from "../components/platos/PlatosList";

export default function Platos() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlato, setEditingPlato] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  const queryClient = useQueryClient();

  // --- Queries ---
  const { data: platos = [], isLoading: loadingPlatos } = useQuery({
    queryKey: ['platos'],
    queryFn: () => base44.entities.Plato.list(),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  const { data: recetas = [] } = useQuery({
    queryKey: ['recetas'],
    queryFn: () => base44.entities.Receta.list(),
  });

  const { data: recetasPrimarias = [] } = useQuery({
    queryKey: ['recetas-primarias'],
    queryFn: () => base44.entities.RecetaPrimaria.list(),
  });

  const { data: recetasSecundarias = [] } = useQuery({
    queryKey: ['recetas-secundarias'],
    queryFn: () => base44.entities.RecetaSecundaria.list(),
  });

  // --- Sesión ---
  const [empleadoSesion, setEmpleadoSesion] = useState(null);
  useEffect(() => {
    const sesion = localStorage.getItem('empleado_sesion');
    if (sesion) setEmpleadoSesion(JSON.parse(sesion));
  }, []);

  // --- Lógica de Negocio: Mapeo de Costos (Optimizado) ---
  // Creamos un mapa de referencia rápida para no perder costos por IDs mal vinculados
  const costosReferencia = useMemo(() => {
    const map = {};
    ingredientes.forEach(i => map[i.id] = i.costo_por_unidad);
    recetasPrimarias.forEach(r => map[r.id] = r.costo_por_unidad);
    recetasSecundarias.forEach(r => map[r.id] = r.costo_por_unidad);
    platos.forEach(p => map[p.id] = p.costo_total || 0);
    return map;
  }, [ingredientes, recetasPrimarias, recetasSecundarias, platos]);

  const calcularCostoTotal = (ingredientesReceta) => {
    return ingredientesReceta.reduce((total, item) => {
      const costoUnitario = costosReferencia[item.ingrediente_id] || 0;
      return total + (item.cantidad_requerida * costoUnitario);
    }, 0);
  };

  // --- Mutations ---
  const createPlatoMutation = useMutation({
    mutationFn: async ({ platoData, ingredientesReceta }) => {
      const costoTotalCalculado = calcularCostoTotal(ingredientesReceta);

      const plato = await base44.entities.Plato.create({
        ...platoData,
        costo_total: costoTotalCalculado,
        precio_sugerido: costoTotalCalculado * 1.7
      });

      for (const item of ingredientesReceta) {
        const costoUnitario = costosReferencia[item.ingrediente_id] || 0;
        
        await base44.entities.Receta.create({
          plato_id: plato.id,
          plato_nombre: plato.nombre,
          ingrediente_id: item.ingrediente_id,
          ingrediente_nombre: item.ingrediente_nombre,
          cantidad_requerida: item.cantidad_requerida,
          costo_ingrediente: item.cantidad_requerida * costoUnitario
        });
      }
      return plato;
    },
    onSuccess: (plato) => {
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      setShowForm(false);
      setEditingPlato(null);
      toast.success(`Plato "${plato.nombre}" creado exitosamente`);
    }
  });

  const updatePlatoMutation = useMutation({
    mutationFn: async ({ platoId, platoData, ingredientesReceta }) => {
      // 1. Calcular nuevo costo total
      const costoTotalCalculado = calcularCostoTotal(ingredientesReceta);

      // 2. Actualizar cabecera del Plato
      const plato = await base44.entities.Plato.update(platoId, {
        ...platoData,
        costo_total: costoTotalCalculado,
        precio_sugerido: costoTotalCalculado * 1.7
      });

      // 3. Eliminar recetas viejas
      const recetasAntiguasIds = recetas
        .filter(r => r.plato_id === platoId)
        .map(r => r.id);
        
      for (const id of recetasAntiguasIds) { 
        await base44.entities.Receta.delete(id); 
      }

      // 4. Crear nuevas filas asegurando que el costo_ingrediente NO sea 0
      for (const item of ingredientesReceta) {
        // Buscamos el costo en nuestro mapa de referencia
        const costoUnitario = costosReferencia[item.ingrediente_id] || 0;
        const costoFinalFila = item.cantidad_requerida * costoUnitario;

        await base44.entities.Receta.create({
          plato_id: platoId,
          plato_nombre: plato.nombre,
          ingrediente_id: item.ingrediente_id,
          ingrediente_nombre: item.ingrediente_nombre,
          cantidad_requerida: item.cantidad_requerida,
          costo_ingrediente: costoFinalFila 
        });
      }
      return plato;
    },
    onSuccess: (plato) => {
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      setShowForm(false);
      setEditingPlato(null);
      toast.success(`Plato "${plato.nombre}" actualizado correctamente`);
    },
    onError: (error) => {
      toast.error("Error al actualizar el plato");
      console.error(error);
    }
  });

  const deletePlatoMutation = useMutation({
    mutationFn: async (platoId) => {
      const recetasDelPlato = recetas.filter(r => r.plato_id === platoId);
      for (const receta of recetasDelPlato) { 
        await base44.entities.Receta.delete(receta.id); 
      }
      await base44.entities.Plato.delete(platoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      toast.success("Plato eliminado");
    }
  });

  // --- Handlers ---
  const handleSubmit = (data) => {
    if (editingPlato) updatePlatoMutation.mutate({ platoId: editingPlato.id, ...data });
    else createPlatoMutation.mutate(data);
  };

  const handleEdit = (plato) => {
    setEditingPlato(plato);
    setShowForm(true);
  };

  const handleDelete = (plato) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el plato "${plato.nombre}"?`)) {
      deletePlatoMutation.mutate(plato.id);
    }
  };

  const filteredPlatos = platos.filter(plato => {
    const matchesSearch = plato.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "todos" || plato.categoria === activeTab;
    return matchesSearch && matchesTab;
  });

  const categorias = ["Entradas", "Bebidas", "Stop Premium", "Ramen", "Recetas Virales", "Menú Infantil", "Adicionales", "Rolls Tempura", "Rolls Frescos"];
  const recetasDelPlato = editingPlato ? recetas.filter(r => r.plato_id === editingPlato.id) : [];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UtensilsCrossed className="w-8 h-8 text-amber-600" />
              Gestión de Platos y Recetas
            </h1>
            <p className="text-gray-500 mt-1">Configuración del menú y escandallos</p>
          </div>
          <Button
            onClick={() => { setEditingPlato(null); setShowForm(!showForm); }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {showForm ? "Cerrar Formulario" : <><Plus className="w-4 h-4 mr-2" /> Nuevo Plato</>}
          </Button>
        </div>

        {/* Formulario */}
        {showForm && (
          <Card className="border-amber-100 shadow-xl animate-in fade-in slide-in-from-top-4">
            <CardContent className="p-6">
              <PlatoForm 
                plato={editingPlato}
                ingredientes={ingredientes}
                recetasPrimarias={recetasPrimarias}
                recetasSecundarias={recetasSecundarias}
                platos={platos}
                recetasExistentes={recetasDelPlato}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingPlato(null); }}
                isLoading={createPlatoMutation.isPending || updatePlatoMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-md border-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg"><Package className="text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Platos</p>
                <p className="text-2xl font-bold">{platos.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Costo Promedio</p>
                <p className="text-2xl font-bold">
                  ${(platos.reduce((acc, p) => acc + (p.costo_total || 0), 0) / (platos.length || 1)).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-none">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg"><TrendingUp className="text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Margen Sugerido</p>
                <p className="text-2xl font-bold">70%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Lista */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Buscar por nombre o descripción..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto bg-transparent gap-2">
              <TabsTrigger value="todos" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white border">Todos</TabsTrigger>
              {categorias.map(cat => (
                <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-amber-600 data-[state=active]:text-white border">{cat}</TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              <PlatosList 
                platos={filteredPlatos}
                recetas={recetas}
                recetasPrimarias={recetasPrimarias}
                recetasSecundarias={recetasSecundarias}
                ingredientes={ingredientes}
                onEdit={handleEdit} 
                onDelete={handleDelete}
                isLoading={loadingPlatos}
                empleado={empleadoSesion}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}