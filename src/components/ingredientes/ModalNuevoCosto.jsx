import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Loader2, TrendingUp, TrendingDown } from "lucide-react";

export default function ModalNuevoCosto({ ingrediente, onConfirm, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    costo_nuevo: ingrediente?.costo_por_unidad || "",
    motivo: "compra_nueva",
    proveedor: ingrediente?.proveedor || "",
    notas: ""
  });

  if (!ingrediente) return null;

  const diferenciaAbsoluta = formData.costo_nuevo - ingrediente.costo_por_unidad;
  const porcentajeCambio = ingrediente.costo_por_unidad > 0 
    ? ((diferenciaAbsoluta / ingrediente.costo_por_unidad) * 100).toFixed(1)
    : 0;

  const hayAumento = diferenciaAbsoluta > 0;
  const hayDisminucion = diferenciaAbsoluta < 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <Dialog open={!!ingrediente} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px] border-none shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-amber-600 to-orange-700 -m-6 mb-6 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Actualizar Costo</DialogTitle>
                <DialogDescription className="text-amber-100 text-sm mt-1">
                  {ingrediente.nombre}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Costo Actual */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Costo Actual</p>
            <p className="text-2xl font-bold text-gray-900">
              ${ingrediente.costo_por_unidad.toFixed(2)}
              <span className="text-sm font-normal text-gray-500 ml-2">/ {ingrediente.unidad_medida}</span>
            </p>
          </div>

          {/* Nuevo Costo */}
          <div className="space-y-2">
            <Label htmlFor="costo_nuevo">Nuevo Costo (por {ingrediente.unidad_medida})</Label>
            <Input
              id="costo_nuevo"
              type="number"
              step="0.01"
              min="0"
              value={formData.costo_nuevo || ""}
              onChange={(e) => setFormData({ ...formData, costo_nuevo: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
              className="text-lg font-semibold"
              placeholder="0.00"
            />
          </div>

          {/* Indicador de Cambio */}
          {diferenciaAbsoluta !== 0 && (
            <div className={`rounded-lg p-3 flex items-center gap-3 ${
              hayAumento ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              {hayAumento ? (
                <TrendingUp className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0" />
              )}
              <div>
                <p className={`font-semibold ${hayAumento ? 'text-red-900' : 'text-green-900'}`}>
                  {hayAumento ? 'Aumento' : 'Disminución'} de ${Math.abs(diferenciaAbsoluta).toFixed(2)}
                </p>
                <p className={`text-sm ${hayAumento ? 'text-red-700' : 'text-green-700'}`}>
                  {hayAumento ? '+' : ''}{porcentajeCambio}% respecto al costo anterior
                </p>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del Cambio *</Label>
            <Select value={formData.motivo} onValueChange={(value) => setFormData({ ...formData, motivo: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compra_nueva">Compra Nueva</SelectItem>
                <SelectItem value="ajuste">Ajuste de Precio</SelectItem>
                <SelectItem value="promocion">Promoción</SelectItem>
                <SelectItem value="cambio_proveedor">Cambio de Proveedor</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Proveedor */}
          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Input
              id="proveedor"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              placeholder="Nombre del proveedor"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas Adicionales</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Detalles adicionales sobre el cambio..."
              rows={3}
            />
          </div>

          {/* Advertencia */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 font-medium">
              ⚙️ Actualización Automática
            </p>
            <p className="text-xs text-blue-700 mt-1">
              El sistema recalculará automáticamente:
            </p>
            <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc space-y-0.5">
              <li>Recetas primarias que usen este ingrediente</li>
              <li>Recetas secundarias que usen este ingrediente</li>
              <li>Costos y precios de todos los platos afectados</li>
            </ul>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="px-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || formData.costo_nuevo === ingrediente.costo_por_unidad}
              className="bg-amber-600 hover:bg-amber-700 px-10 h-11 rounded-xl font-bold shadow-lg shadow-amber-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Confirmar Actualización
                  <DollarSign className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}