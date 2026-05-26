import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Plus, Users, Loader2, DollarSign } from "lucide-react";

export default function PersonalList({ personal, onEdit, onDelete, onNuevo, isLoading }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
          <p className="mt-4 text-gray-500">Cargando personal...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestión de Personal
          </CardTitle>
          <Button onClick={onNuevo} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Personal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {personal.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No hay personal registrado</p>
            <p className="text-gray-400 text-sm mt-2">Haz clic en "Agregar Personal" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Nombre Completo</TableHead>
                  <TableHead className="font-semibold">Usuario</TableHead>
                  <TableHead className="font-semibold">Cargo</TableHead>
                  <TableHead className="font-semibold">Rol</TableHead>
                  <TableHead className="font-semibold text-right">Salario Base</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personal.map((persona) => {
                  const salario = persona.salario_base ?? 0;
                  return (
                    <TableRow key={persona.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{persona.nombre}</p>
                          {persona.cedula && (
                            <p className="text-xs text-gray-400">{persona.cedula}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {persona.usuario || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {persona.cargo ? (
                          <span className="text-gray-700">{persona.cargo}</span>
                        ) : (
                          <span className="text-gray-300 italic text-sm">Sin cargo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {persona.rol || 'Sin rol'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {salario > 0 ? (
                          <span className="font-bold text-violet-700 flex items-center justify-end gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {salario.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-amber-500 text-xs font-medium bg-amber-50 px-2 py-1 rounded-full">
                            Sin salario
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={persona.activo ? "default" : "secondary"}
                          className={persona.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {persona.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(persona)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(persona.id)}
                            disabled={deletingId === persona.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deletingId === persona.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
