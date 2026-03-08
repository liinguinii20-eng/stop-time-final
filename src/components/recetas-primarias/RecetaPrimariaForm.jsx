import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, XCircle, Plus, Trash2, ChefHat, Calculator } from "lucide-react";
import { toast } from "sonner";

export default function RecetaPrimariaForm({ receta, ingredientes, detalles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(receta || {
    nombre: "",
    descripcion: "",
    unidad_medida: "kg",
    cantidad_resultante: 1,
    tiempo_preparacion: 0,
    instrucciones: "",
    activa: true
  });

  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState("");
  const [cantidadIngrediente, setCantidadIngrediente] = useState("");
  const [ingredientesAgregados, setIngredientesAgregados] = useState(
    detalles.map(d => ({
      id: d.ingrediente_id,
      nombre: d.ingrediente_nombre,
      cantidad: d.cantidad_requerida,
      unidad: d.unidad_medida
    }))
  );

  const handleAgregarIngrediente = () => {
    if (!ingredienteSeleccionado) {
      toast.error("Selecciona un ingrediente");
      return;
    }

    if (!cantidadIngrediente || parseFloat(cantidadIngrediente) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    const ingrediente = ingredientes.find(i => i.id === ingredienteSeleccionado);
    if (!ingrediente) return;

    setIngredientesAgregados([...ingredientesAgregados, {
      id: ingrediente.id,
      nombre: ingrediente.nombre,
      cantidad: parseFloat(cantidadIngrediente),
      unidad: ingrediente.unidad_medida
    }]);

    setIngredienteSeleccionado("");
    setCantidadIngrediente("");
    toast.success("Ingrediente agregado");
  };

  const handleEliminarIngrediente = (index) => {
    setIngredientesAgregados(ingredientesAgregados.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (ingredientesAgregados.length === 0) {
      toast.error("Agrega al menos un ingrediente");
      return;
    }

    onSubmit({
      recetaData: formData,
      ingredientesSeleccionados: ingredientesAgregados
    });
  };

  const ingredientesDisponibles = ingredientes.filter(
    ing => !ingredientesAgregados.some(a => a.id === ing.id)
  );

  // Cálculos en tiempo real
  const { costoTotal, costoPorUnidad } = useMemo(() => {
    const total = ingredientesAgregados.reduce((sum, item) => {
      const ing = ingredientes.find(i => i.id === item.id);
      return sum + (ing ? ing.costo_por_unidad * item.cantidad : 0);
    }, 0);
    
    const porUnidad = formData.cantidad_resultante > 0 ? total / formData.cantidad_resultante : 0;
    return { costoTotal: total, costoPorUnidad: porUnidad };
  }, [ingredientesAgregados, ingredientes, formData.cantidad_resultante]);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          {receta ? "Editar Receta Primaria" : "Nueva Receta Primaria"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Salsa de tomate"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiempo">Tiempo de Preparación (min)</Label>
              <Input
                id="tiempo"
                type="number"
                min="0"
                value={formData.tiempo_preparacion}
                onChange={(e) => setFormData({ ...formData, tiempo_preparacion: parseInt(e.target.value) || "" })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad de Medida *</Label>
              <Select
                value={formData.unidad_medida}
                onValueChange={(value) => setFormData({ ...formData, unidad_medida: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                  <SelectItem value="g">Gramos (g)</SelectItem>
                  <SelectItem value="l">Litros (l)</SelectItem>
                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  <SelectItem value="unidad">Unidad</SelectItem>
                  <SelectItem value="porcion">Porción</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad Resultante *</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.cantidad_resultante}
                onChange={(e) => setFormData({ ...formData, cantidad_resultante: parseFloat(e.target.value) || 1 })}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción breve de la receta"
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="instrucciones">Instrucciones de Preparación</Label>
              <Textarea
                id="instrucciones"
                value={formData.instrucciones}
                onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                placeholder="Paso a paso para preparar esta receta"
                rows={4}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Ingredientes de la Receta</h3>
            
            <Card className="bg-blue-50 border-blue-200 mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6 space-y-2">
                    <Label>Ingrediente</Label>
                    <Select value={ingredienteSeleccionado} onValueChange={setIngredienteSeleccionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ingrediente" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredientesDisponibles.map(ing => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.nombre} ({ing.unidad_medida})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={cantidadIngrediente}
                      onChange={(e) => setCantidadIngrediente(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      onClick={handleAgregarIngrediente}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {ingredientesAgregados.length > 0 ? (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Ingrediente</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right font-bold text-amber-700">Subtotal</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientesAgregados.map((item, index) => {
                        const ing = ingredientes.find(i => i.id === item.id);
                        const costoUnitario = ing ? ing.costo_por_unidad : 0;
                        const subtotal = costoUnitario * item.cantidad;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.nombre}</TableCell>
                            <TableCell className="text-right font-semibold">{item.cantidad}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.unidad}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-gray-500">
                              ${costoUnitario.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-600">
                              ${subtotal.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEliminarIngrediente(index)}
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

                {/* Panel de Resumen de Costos */}
                <div className="bg-amber-50 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-amber-200">
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="w-4 h-4 text-amber-600" />
                      <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">Costo Total de Ingredientes</p>
                    </div>
                    <p className="text-3xl font-black text-amber-900">${costoTotal.toFixed(2)}</p>
                  </div>
                  <div className="hidden md:block h-10 w-px bg-amber-300"></div>
                  <div className="text-center md:text-right">
                    <p className="text-xs text-amber-600 uppercase tracking-wider font-bold mb-1">
                      Costo por {formData.unidad_medida}
                    </p>
                    <p className="text-3xl font-black text-amber-900">${costoPorUnidad.toFixed(2)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="text-gray-500">No hay ingredientes agregados</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-gray-50">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}