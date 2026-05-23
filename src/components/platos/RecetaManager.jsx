import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function RecetaManager({ plato, ingredientes, recetas, recetasPrimarias = [], recetasSecundarias = [], onClose }) {
  const [tipoElemento, setTipoElemento] = useState("ingrediente");
  const [selectedIngrediente, setSelectedIngrediente] = useState("");
  const [cantidad, setCantidad] = useState(0);
  const queryClient = useQueryClient();

  const recetasPlato = recetas.filter(r => r.plato_id === plato.id);

  const addRecetaMutation = useMutation({
    mutationFn: async (recetaData) => {
      let elemento, nombreElemento, costoIngrediente;
      
      if (recetaData.tipo === "ingrediente") {
        elemento = ingredientes.find(i => i.id === recetaData.ingrediente_id);
        nombreElemento = elemento.nombre;
        costoIngrediente = recetaData.cantidad_requerida * elemento.costo_por_unidad;
      } else if (recetaData.tipo === "receta_primaria") {
        elemento = recetasPrimarias.find(r => r.id === recetaData.ingrediente_id);
        nombreElemento = elemento.nombre;
        costoIngrediente = recetaData.cantidad_requerida * elemento.costo_por_unidad;
      } else if (recetaData.tipo === "receta_secundaria") {
        elemento = recetasSecundarias.find(r => r.id === recetaData.ingrediente_id);
        nombreElemento = elemento.nombre;
        costoIngrediente = recetaData.cantidad_requerida * elemento.costo_por_unidad;
      }
      const payload = {
        ...recetaData,
        costo_ingrediente: costoIngrediente,
        plato_nombre: plato.nombre,
        ingrediente_nombre: nombreElemento
      };
      console.log('Payload a enviar:', payload);
      
      return base44.entities.Receta.create(payload);
    },
    onSuccess: async () => {
      await recalcularCostoPlato();
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      setSelectedIngrediente("");
      setCantidad(0);
      toast.success("Ingrediente agregado a la receta");
    },
  });

  const deleteRecetaMutation = useMutation({
    mutationFn: (recetaId) => base44.entities.Receta.delete(recetaId),
    onSuccess: async () => {
      await recalcularCostoPlato();
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      toast.success("Ingrediente eliminado de la receta");
    },
  });

  const recalcularCostoPlato = async () => {
    const recetasActualizadas = await base44.entities.Receta.filter({ plato_id: plato.id });
    const costoTotal = recetasActualizadas.reduce((sum, r) => sum + (r.costo_ingrediente || 0), 0);
    const precioSugerido = costoTotal * 1.7;
    
    await base44.entities.Plato.update(plato.id, {
      costo_total: costoTotal,
      precio_sugerido: precioSugerido
    });
  };

  const handleAddIngrediente = () => {
    if (!selectedIngrediente || cantidad <= 0) {
      toast.error("Selecciona un elemento y cantidad válida");
      return;
    }

    const yaExiste = recetasPlato.some(r => r.ingrediente_id === selectedIngrediente);
    if (yaExiste) {
      toast.error("Este elemento ya está en la receta");
      return;
    }

    addRecetaMutation.mutate({
      plato_id: plato.id,
      ingrediente_id: selectedIngrediente,
      cantidad_requerida: cantidad,
      tipo: tipoElemento
    });
  };

  const elementosDisponibles = tipoElemento === "ingrediente"
    ? ingredientes
    : tipoElemento === "receta_primaria"
    ? recetasPrimarias
    : recetasSecundarias;

  const costoTotal = recetasPlato.reduce((sum, r) => sum + (r.costo_ingrediente || 0), 0);
  const precioSugerido = costoTotal * 1.7;

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
        <CardTitle className="text-xl">
          Receta: {plato.nombre}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Add Element Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipoElemento} onValueChange={(val) => {
              setTipoElemento(val);
              setSelectedIngrediente("");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingrediente">Ingrediente</SelectItem>
                <SelectItem value="receta_primaria">Receta Primaria</SelectItem>
                <SelectItem value="receta_secundaria">Receta Secundaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Elemento</Label>
            <Select value={selectedIngrediente} onValueChange={setSelectedIngrediente}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {elementosDisponibles.map(elem => (
                  <SelectItem key={elem.id} value={elem.id}>
                    {elem.nombre} ({elem.unidad_medida})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAddIngrediente}
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={addRecetaMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Elements List */}
        <div>
          <h3 className="font-semibold mb-3">Elementos de la Receta</h3>
          {recetasPlato.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Elemento</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recetasPlato.map((receta) => {
                    const ingrediente = ingredientes.find(i => i.id === receta.ingrediente_id);
                    const recetaPrimaria = recetasPrimarias.find(r => r.id === receta.ingrediente_id);
                    const recetaSecundaria = recetasSecundarias.find(r => r.id === receta.ingrediente_id);
                    const elemento = ingrediente || recetaPrimaria || recetaSecundaria;
                    
                    return (
                      <TableRow key={receta.id}>
                        <TableCell className="font-medium">{receta.ingrediente_nombre}</TableCell>
                        <TableCell>
                          {receta.cantidad_requerida} {elemento?.unidad_medida}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ${receta.costo_ingrediente.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRecetaMutation.mutate(receta.id)}
                            disabled={deleteRecetaMutation.isPending}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay elementos en esta receta
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Costo Total</p>
            <p className="text-2xl font-bold text-green-700">${costoTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Precio Sugerido (70% margen)</p>
            <p className="text-2xl font-bold text-amber-700">${precioSugerido.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Precio Actual</p>
            <p className="text-2xl font-bold text-blue-700">${plato.precio.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3 bg-gray-50">
        <Button variant="outline" onClick={onClose}>
          <XCircle className="w-4 h-4 mr-2" />
          Cerrar
        </Button>
      </CardFooter>
    </Card>
  );
}