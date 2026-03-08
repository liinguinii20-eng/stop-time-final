import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

function CategoriaForm({ categoria, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(categoria || {
    nombre: "",
    descripcion: "",
    color: "#6b7280"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-xl">
          {categoria ? "Editar Categoría" : "Nueva Categoría de Gasto"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Categoría *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Ej: Servicios Públicos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe esta categoría de gasto..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color de Identificación</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Badge style={{ backgroundColor: formData.color, color: 'white' }}>
                {formData.nombre || "Vista previa"}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-gray-50">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function CategoriasGastos() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);

  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-gastos'],
    queryFn: () => base44.entities.CategoriaGasto.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoriaGasto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-gastos'] });
      setShowForm(false);
      setEditingCategoria(null);
      toast.success("Categoría creada exitosamente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoriaGasto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-gastos'] });
      setShowForm(false);
      setEditingCategoria(null);
      toast.success("Categoría actualizada exitosamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoriaGasto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-gastos'] });
      toast.success("Categoría eliminada exitosamente");
    },
  });

  const handleSubmit = (data) => {
    if (editingCategoria) {
      updateMutation.mutate({ id: editingCategoria.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategoria(categoria);
    setShowForm(true);
  };

  const handleDelete = (categoria) => {
    if (confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`)) {
      deleteMutation.mutate(categoria.id);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Tag className="w-8 h-8 text-blue-600" />
              Categorías de Gastos
            </h1>
            <p className="text-gray-500 mt-1">Organiza tus tipos de gastos operativos</p>
          </div>
          <Button
            onClick={() => {
              setEditingCategoria(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>

        {showForm && (
          <CategoriaForm
            categoria={editingCategoria}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingCategoria(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Categorías Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : categorias.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categorias.map((categoria) => (
                  <div
                    key={categoria.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: categoria.color }}
                          />
                          <h3 className="font-semibold text-lg">{categoria.nombre}</h3>
                        </div>
                        {categoria.descripcion && (
                          <p className="text-sm text-gray-600 mb-3">{categoria.descripcion}</p>
                        )}
                        <Badge style={{ backgroundColor: categoria.color, color: 'white' }}>
                          {categoria.nombre}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(categoria)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(categoria)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay categorías registradas</p>
                <p className="text-sm text-gray-400 mt-1">
                  Crea categorías para organizar mejor tus gastos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}