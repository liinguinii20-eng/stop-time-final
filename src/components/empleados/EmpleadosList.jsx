import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";

export default function EmpleadosList({ empleados, onEdit, onDelete }) {
  const rolColors = {
    mesero: "bg-blue-100 text-blue-800",
    cocinero: "bg-orange-100 text-orange-800",
    cajero: "bg-green-100 text-green-800",
    administrador: "bg-purple-100 text-purple-800"
  };

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                <div className="font-medium">{emp.nombre_completo}</div>
                <div className="text-xs text-gray-500">@{emp.usuario}</div>
              </TableCell>
              <TableCell>
                <Badge className={rolColors[emp.rol] || "bg-gray-100"}>{emp.rol}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={emp.activo ? "default" : "secondary"}>
                  {emp.activo ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(emp)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(emp)} className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}