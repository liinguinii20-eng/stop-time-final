import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// IMPORTACIONES CORRECTAS
import EmpleadoForm from "../components/empleados/EmpleadoForm";
import EmpleadosList from "../components/empleados/EmpleadosList";
import ConfirmDeleteModal from "../components/empleados/ConfirmDeleteModal";

export default function GestionEmpleados() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);
  const [empleadoToDelete, setEmpleadoToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.Empleado.list('-created_date'),
  });

  const mutation = useMutation({
    mutationFn: (data) => editingEmpleado 
      ? base44.entities.Empleado.update(editingEmpleado.id, data)
      : base44.entities.Empleado.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['empleados']);
      toast.success("Operación exitosa");
      setShowForm(false);
      setEditingEmpleado(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Empleado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['empleados']);
      setEmpleadoToDelete(null);
      toast.success("Empleado eliminado");
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="text-amber-600" /> Gestión de Empleados
        </h1>
        <Button onClick={() => { setEditingEmpleado(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Empleado
        </Button>
      </div>

      {showForm && (
        <EmpleadoForm 
          empleado={editingEmpleado} 
          onSubmit={(data) => mutation.mutate(data)} 
          onCancel={() => setShowForm(false)}
          isLoading={mutation.isPending}
        />
      )}

      <EmpleadosList 
        empleados={empleados} 
        onEdit={(emp) => { setEditingEmpleado(emp); setShowForm(true); }}
        onDelete={setEmpleadoToDelete}
      />

      <ConfirmDeleteModal 
        empleado={empleadoToDelete}
        onConfirm={() => deleteMutation.mutate(empleadoToDelete.id)}
        onCancel={() => setEmpleadoToDelete(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}