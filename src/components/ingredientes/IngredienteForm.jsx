import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, XCircle } from "lucide-react";

export default function IngredienteForm({ ingrediente, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(ingrediente || {
    nombre: "",
    unidad_medida: "kg",
    costo_por_unidad: "",
    cantidad_disponible: "",
    cantidad_minima: "",
    proveedor: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
        <CardTitle className="text-xl">
          {ingrediente ? "Editar Ingrediente" : "Nuevo Ingrediente"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Tomate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidad_medida">Unidad de Medida *</Label>
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
                  <SelectItem value="paquete">Paquete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo_por_unidad">Costo por Unidad ($) *</Label>
              <Input
                id="costo_por_unidad"
                type="number"
                step="0.00001"
                min="0"
                value={formData.costo_por_unidad || ""}
                onChange={(e) => setFormData({ ...formData, costo_por_unidad: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad_disponible">Cantidad Disponible *</Label>
              <Input
                id="cantidad_disponible"
                type="number"
                step="0.00001"
                min="0"
                value={formData.cantidad_disponible || ""}
                onChange={(e) => setFormData({ ...formData, cantidad_disponible: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                required
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad_minima">Cantidad Mínima *</Label>
              <Input
                id="cantidad_minima"
                type="number"
                step="0.00001"
                min="0"
                value={formData.cantidad_minima || ""}
                onChange={(e) => setFormData({ ...formData, cantidad_minima: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                required
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>
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