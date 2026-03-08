import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, XCircle, Edit3, Package } from "lucide-react";

export default function ModalEditarIngrediente({ ingrediente, onConfirm, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    nombre: "",
    unidad_medida: "kg",
    costo_por_unidad: "",
    cantidad_disponible: "",
    cantidad_minima: "",
    proveedor: ""
  });

  useEffect(() => {
    if (ingrediente) {
      setFormData({
        nombre: ingrediente.nombre || "",
        unidad_medida: ingrediente.unidad_medida || "kg",
        costo_por_unidad: ingrediente.costo_por_unidad || "",
        cantidad_disponible: ingrediente.cantidad_disponible || "",
        cantidad_minima: ingrediente.cantidad_minima || "",
        proveedor: ingrediente.proveedor || ""
      });
    }
  }, [ingrediente]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  if (!ingrediente) return null;

  return (
    <Dialog open={!!ingrediente} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-none shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 -m-6 mb-4 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Editar Ingrediente</DialogTitle>
                <p className="text-blue-100 text-sm mt-1">{ingrediente?.nombre}</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-none">
              <Package className="w-3 h-3 mr-1" /> Modificar
            </Badge>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Nombre del Ingrediente</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Tomate"
                className="h-12 text-lg border-gray-200 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Unidad de Medida</Label>
              <Select
                value={formData.unidad_medida}
                onValueChange={(value) => setFormData({ ...formData, unidad_medida: value })}
              >
                <SelectTrigger className="h-11 rounded-xl">
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
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Costo Unitario ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.costo_por_unidad || ""}
                onChange={(e) => setFormData({ ...formData, costo_por_unidad: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                placeholder="0.00"
                className="h-11 rounded-xl text-right font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Stock Disponible</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.cantidad_disponible || ""}
                onChange={(e) => setFormData({ ...formData, cantidad_disponible: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                required
                placeholder="0"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Stock Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.cantidad_minima || ""}
                onChange={(e) => setFormData({ ...formData, cantidad_minima: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                required
                placeholder="0"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Proveedor</Label>
              <Input
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button 
              type="button" 
              variant="ghost"
              onClick={onCancel} 
              disabled={isLoading}
              className="px-8"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 px-10 h-11 rounded-xl font-bold shadow-lg shadow-blue-200" 
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Guardar Cambios"}
              <Save className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}