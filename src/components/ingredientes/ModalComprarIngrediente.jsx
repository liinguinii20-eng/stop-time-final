import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShoppingCart } from "lucide-react";

export default function ModalComprarIngrediente({ ingrediente, onConfirm, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    cantidad: "",
    costo_unitario: "",
    proveedor: "",
    numero_factura: "",
    metodo_pago: "Efectivo",
    notas: ""
  });

  useEffect(() => {
    if (ingrediente) {
      setFormData({
        cantidad: "",
        costo_unitario: ingrediente.costo_por_unidad || "",
        proveedor: ingrediente.proveedor || "",
        numero_factura: "",
        metodo_pago: "Efectivo",
        notas: ""
      });
    }
  }, [ingrediente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cantidad || !formData.costo_unitario) return;

    onConfirm({
      ...formData,
      cantidad: parseFloat(formData.cantidad),
      costo_unitario: parseFloat(formData.costo_unitario)
    });
  };

  const costoTotal = (parseFloat(formData.cantidad || 0) * parseFloat(formData.costo_unitario || 0)).toFixed(2);

  return (
    <Dialog open={!!ingrediente} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            Comprar Ingrediente
          </DialogTitle>
          <DialogDescription>
            Registra una nueva compra para {ingrediente?.nombre}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">
                Cantidad ({ingrediente?.unidad_medida}) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                step="any"
                min="0.01"
                required
                value={formData.cantidad}
                onChange={handleChange}
                placeholder="Ej. 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_unitario">
                Costo Unitario ($) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="costo_unitario"
                name="costo_unitario"
                type="number"
                step="any"
                min="0.01"
                required
                value={formData.costo_unitario}
                onChange={handleChange}
                placeholder="Ej. 5.50"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500">Costo Total Estimado:</span>
            <span className="text-lg font-bold text-green-600">${costoTotal}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Input
              id="proveedor"
              name="proveedor"
              value={formData.proveedor}
              onChange={handleChange}
              placeholder="Nombre del proveedor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_factura">Nº Factura / Recibo</Label>
              <Input
                id="numero_factura"
                name="numero_factura"
                value={formData.numero_factura}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodo_pago">Método de Pago</Label>
              <select
                id="metodo_pago"
                name="metodo_pago"
                value={formData.metodo_pago}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Zelle">Zelle</option>
                <option value="Binance">Binance</option>
                <option value="Pago Móvil">Pago Móvil</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (Opcional)</Label>
            <Input
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Detalles adicionales de la compra..."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Compra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}