import { useState, useMemo } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, DollarSign, Users, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth } from "date-fns";

import AdelantoForm from "../components/adelantos/AdelantoForm";
import AdelantosList from "../components/adelantos/AdelantosList";

export default function Adelantos() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAdelanto, setEditingAdelanto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");

  const queryClient = useQueryClient();

  const { data: adelantos = [], isLoading } = useQuery({
    queryKey: ['adelantos'],
    queryFn: () => base44.entities.Adelanto.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Adelanto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adelantos'] });
      setIsOpen(false);
      setEditingAdelanto(null);
      toast.success("Adelanto registrado");
    },
    onError: (error) => {
      toast.error("Error al crear adelanto: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Adelanto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adelantos'] });
      setIsOpen(false);
      setEditingAdelanto(null);
      toast.success("Adelanto actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Adelanto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adelantos'] });
      toast.success("Adelanto eliminado");
    },
  });

  const handleSubmit = (data) => {
    if (editingAdelanto) {
      updateMutation.mutate({ id: editingAdelanto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (adelanto) => {
    setEditingAdelanto(adelanto);
    setIsOpen(true);
  };

  const handleMarcarDescontado = (adelanto) => {
    updateMutation.mutate({
      id: adelanto.id,
      data: { ...adelanto, estado: 'descontado', fecha_descuento: new Date().toISOString() }
    });
  };

  const { filteredAdelantos, stats } = useMemo(() => {
    const today = new Date();
    const inicio = startOfMonth(today);
    const fin = endOfMonth(today);

    const filtered = adelantos.filter(a => {
      const matchesSearch = a.empleado_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = estadoFiltro === "todos" || a.estado === estadoFiltro;
      return matchesSearch && matchesEstado;
    });

    const delMes = adelantos.filter(a => {
      const f = new Date(a.fecha_adelanto);
      return f >= inicio && f <= fin;
    });

    return {
      filteredAdelantos: filtered,
      stats: {
        total: delMes.reduce((s, a) => s + (a.monto || 0), 0),
        pendientes: delMes.filter(a => a.estado === "pendiente").reduce((s, a) => s + (a.monto || 0), 0),
        empleados: new Set(delMes.map(a => a.empleado_id)).size
      }
    };
  }, [adelantos, searchTerm, estadoFiltro]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Adelantos</h1>
          <p className="text-gray-500">Gestión de anticipos salariales</p>
        </div>
        <Button onClick={() => { setEditingAdelanto(null); setIsOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Adelanto
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAdelanto ? "Editar Adelanto" : "Nuevo Adelanto"}</DialogTitle>
          </DialogHeader>
          <AdelantoForm
            adelanto={editingAdelanto}
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">${stats.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              <span className="text-2xl font-bold">${stats.pendientes.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.empleados}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="descontado">Descontados</option>
        </select>
      </div>

      <AdelantosList
        adelantos={filteredAdelantos}
        onEdit={handleEdit}
        onDelete={(a) => window.confirm('¿Eliminar este adelanto?') && deleteMutation.mutate(a.id)}
        onMarcarDescontado={handleMarcarDescontado}
        isLoading={isLoading}
      />
    </div>
  );
}