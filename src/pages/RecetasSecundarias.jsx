import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChefHat, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import RecetaSecundariaForm from "../components/recetas-secundarias/RecetaSecundariaForm";
import RecetasSecundariasList from "../components/recetas-secundarias/RecetasSecundariasList";

export default function RecetasSecundarias() {
  const [showForm, setShowForm] = useState(false);
  const [editingReceta, setEditingReceta] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();

  const { data: recetas = [], isLoading } = useQuery({
    queryKey: ['recetas-secundarias'],
    queryFn: () => base44.entities.RecetaSecundaria.list('-created_date', 200),
  });

  const { data: detalles = [] } = useQuery({
    queryKey: ['detalles-recetas-secundarias'],
    queryFn: () => base44.entities.DetalleRecetaSecundaria.list('-created_date', 500),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  const { data: recetasPrimarias = [] } = useQuery({
    queryKey: ['recetas-primarias'],
    queryFn: () => base44.entities.RecetaPrimaria.list(),
  });

  const createMutation = useMutation({
    mutationFn: async ({ recetaData, elementosSeleccionados }) => {
      let costoTotal = 0;
      for (const elem of elementosSeleccionados) {
        if (elem.tipo === "ingrediente") {
          const ingrediente = ingredientes.find(i => i.id === elem.id);
          if (ingrediente) {
            costoTotal += ingrediente.costo_por_unidad * elem.cantidad;
          }
        } else if (elem.tipo === "receta_primaria") {
          const receta = recetasPrimarias.find(r => r.id === elem.id);
          if (receta) {
            costoTotal += receta.costo_por_unidad * elem.cantidad;
          }
        }
      }

      const costoPorUnidad = recetaData.cantidad_resultante > 0 
        ? costoTotal / recetaData.cantidad_resultante 
        : 0;

      const receta = await base44.entities.RecetaSecundaria.create({
        ...recetaData,
        costo_total: costoTotal,
        costo_por_unidad: costoPorUnidad
      });

      for (const elem of elementosSeleccionados) {
        let elementoData, costoElemento, unidadMedida;
        
        if (elem.tipo === "ingrediente") {
          elementoData = ingredientes.find(i => i.id === elem.id);
          costoElemento = elementoData ? elementoData.costo_por_unidad * elem.cantidad : 0;
          unidadMedida = elementoData?.unidad_medida;
        } else {
          elementoData = recetasPrimarias.find(r => r.id === elem.id);
          costoElemento = elementoData ? elementoData.costo_por_unidad * elem.cantidad : 0;
          unidadMedida = elementoData?.unidad_medida;
        }

        await base44.entities.DetalleRecetaSecundaria.create({
          receta_secundaria_id: receta.id,
          elemento_id: elem.id,
          elemento_nombre: elem.nombre,
          tipo_elemento: elem.tipo,
          cantidad_requerida: elem.cantidad,
          unidad_medida: unidadMedida,
          costo_elemento: costoElemento
        });
      }

      return receta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas-secundarias'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-recetas-secundarias'] });
      setShowForm(false);
      setEditingReceta(null);
      toast.success("Receta secundaria creada exitosamente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, recetaData, elementosSeleccionados }) => {
      let costoTotal = 0;
      for (const elem of elementosSeleccionados) {
        if (elem.tipo === "ingrediente") {
          const ingrediente = ingredientes.find(i => i.id === elem.id);
          if (ingrediente) {
            costoTotal += ingrediente.costo_por_unidad * elem.cantidad;
          }
        } else if (elem.tipo === "receta_primaria") {
          const receta = recetasPrimarias.find(r => r.id === elem.id);
          if (receta) {
            costoTotal += receta.costo_por_unidad * elem.cantidad;
          }
        }
      }

      const costoPorUnidad = recetaData.cantidad_resultante > 0 
        ? costoTotal / recetaData.cantidad_resultante 
        : 0;

      await base44.entities.RecetaSecundaria.update(id, {
        ...recetaData,
        costo_total: costoTotal,
        costo_por_unidad: costoPorUnidad
      });

      const detallesAntiguos = detalles.filter(d => d.receta_secundaria_id === id);
      for (const detalle of detallesAntiguos) {
        await base44.entities.DetalleRecetaSecundaria.delete(detalle.id);
      }

      for (const elem of elementosSeleccionados) {
        let elementoData, costoElemento, unidadMedida;
        
        if (elem.tipo === "ingrediente") {
          elementoData = ingredientes.find(i => i.id === elem.id);
          costoElemento = elementoData ? elementoData.costo_por_unidad * elem.cantidad : 0;
          unidadMedida = elementoData?.unidad_medida;
        } else {
          elementoData = recetasPrimarias.find(r => r.id === elem.id);
          costoElemento = elementoData ? elementoData.costo_por_unidad * elem.cantidad : 0;
          unidadMedida = elementoData?.unidad_medida;
        }

        await base44.entities.DetalleRecetaSecundaria.create({
          receta_secundaria_id: id,
          elemento_id: elem.id,
          elemento_nombre: elem.nombre,
          tipo_elemento: elem.tipo,
          cantidad_requerida: elem.cantidad,
          unidad_medida: unidadMedida,
          costo_elemento: costoElemento
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas-secundarias'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-recetas-secundarias'] });
      setShowForm(false);
      setEditingReceta(null);
      toast.success("Receta secundaria actualizada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const detallesReceta = detalles.filter(d => d.receta_secundaria_id === id);
      for (const detalle of detallesReceta) {
        await base44.entities.DetalleRecetaSecundaria.delete(detalle.id);
      }
      await base44.entities.RecetaSecundaria.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas-secundarias'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-recetas-secundarias'] });
      toast.success("Receta secundaria eliminada");
    },
  });

  const handleSubmit = (data) => {
    if (editingReceta) {
      updateMutation.mutate({ id: editingReceta.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (receta) => {
    setEditingReceta(receta);
    setShowForm(true);
  };

  const handleDelete = (receta) => {
    if (window.confirm(`¿Eliminar la receta "${receta.nombre}"?`)) {
      deleteMutation.mutate(receta.id);
    }
  };

  const filteredRecetas = recetas.filter(r =>
    r.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
              <span className="leading-tight">Recetas Secundarias</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Preparaciones con ingredientes y recetas primarias
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingReceta(null);
              setShowForm(!showForm);
            }}
            className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Receta Secundaria
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg border-none">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Recetas</p>
                  <h3 className="text-3xl font-bold text-gray-900">{recetas.length}</h3>
                </div>
                <div className="p-3 rounded-xl bg-purple-100">
                  <ChefHat className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Activas</p>
                  <h3 className="text-3xl font-bold text-green-600">
                    {recetas.filter(r => r.activa).length}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Costo Promedio</p>
                  <h3 className="text-3xl font-bold text-blue-600">
                    ${recetas.length > 0 
                      ? (recetas.reduce((sum, r) => sum + r.costo_por_unidad, 0) / recetas.length).toFixed(2)
                      : '0.00'
                    }
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-100">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-none">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar recetas secundarias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <RecetaSecundariaForm
            receta={editingReceta}
            ingredientes={ingredientes}
            recetasPrimarias={recetasPrimarias}
            detalles={editingReceta ? detalles.filter(d => d.receta_secundaria_id === editingReceta.id) : []}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingReceta(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <RecetasSecundariasList
          recetas={filteredRecetas}
          detalles={detalles}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
