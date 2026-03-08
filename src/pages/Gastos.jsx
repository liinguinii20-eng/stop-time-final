import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

import GastoForm from "../components/gastos/GastoForm";
import GastosList from "../components/gastos/GastosList";
import ResumenGastos from "../components/gastos/ResumenGastos";

export default function Gastos() {
  const [showForm, setShowForm] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");

  const queryClient = useQueryClient();

  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Gasto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setShowForm(false);
      setEditingGasto(null);
      toast.success("Gasto registrado exitosamente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Gasto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setShowForm(false);
      setEditingGasto(null);
      toast.success("Gasto actualizado exitosamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Gasto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      toast.success("Gasto eliminado exitosamente");
    },
  });

  const handleSubmit = (data) => {
    if (editingGasto) {
      updateMutation.mutate({ id: editingGasto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (gasto) => {
    setEditingGasto(gasto);
    setShowForm(true);
  };

  const handleDelete = (gasto) => {
    if (confirm(`¿Estás seguro de eliminar el gasto "${gasto.descripcion}"?`)) {
      deleteMutation.mutate(gasto.id);
    }
  };

  // Filtros
  const filteredGastos = gastos.filter(gasto => {
    const matchesSearch = gasto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gasto.comprobante?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFiltro === "todos" || gasto.categoria === categoriaFiltro;
    return matchesSearch && matchesCategoria;
  });

  // Calcular estadísticas del mes actual
  const today = new Date();
  const inicioMes = startOfMonth(today);
  const finMes = endOfMonth(today);
  
  const gastosDelMes = gastos.filter(g => {
    const fecha = new Date(g.fecha_gasto);
    return fecha >= inicioMes && fecha <= finMes;
  });

  const totalMes = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);
  const totalGeneral = gastos.reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="w-full">
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
              <span className="leading-tight">Gastos Operativos</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Registra y controla los gastos del restaurante</p>
          </div>
          <Button
            onClick={() => {
              console.log('🔴 Botón Registrar Gasto clickeado');
              console.log('Estado actual showForm:', showForm);
              setEditingGasto(null);
              setShowForm(!showForm);
              console.log('Nuevo estado showForm:', !showForm);
            }}
            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">Gastos de {format(today, "MMMM", { locale: es })}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-red-600 truncate">${totalMes.toFixed(2)}</h3>
                  <p className="text-xs text-gray-500 mt-1">{gastosDelMes.length} gastos</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-red-100 flex-shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Acumulado</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">${totalGeneral.toFixed(2)}</h3>
                  <p className="text-xs text-gray-500 mt-1 truncate">{gastos.length} gastos registrados</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-gray-100 flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">Promedio Mensual</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 truncate">
                    ${gastos.length > 0 ? (totalGeneral / Math.max(1, new Set(gastos.map(g => format(new Date(g.fecha_gasto), "yyyy-MM"))).size)).toFixed(2) : "0.00"}
                  </h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-amber-100 flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen por Categoría */}
        <ResumenGastos gastos={gastosDelMes} />

        {/* Search and Filter */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  placeholder="Buscar gastos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm sm:text-base"
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm sm:text-base"
              >
                <option value="todos">Todas las categorías</option>
                <option value="Alquiler">Alquiler</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Nómina">Nómina</option>
                <option value="Marketing">Marketing</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Impuestos">Impuestos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <div className="animate-in fade-in duration-300">
            <GastoForm
              gasto={editingGasto}
              onSubmit={handleSubmit}
              onCancel={() => {
                console.log('❌ Cancelando formulario de gasto');
                setShowForm(false);
                setEditingGasto(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        {/* List */}
        <GastosList
          gastos={filteredGastos}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}