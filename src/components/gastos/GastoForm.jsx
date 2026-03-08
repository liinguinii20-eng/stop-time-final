import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function GastoForm({ gasto, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    fecha_gasto: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    descripcion: "",
    categoria: "Otros",
    monto: "",
    metodo_pago: "efectivo_usd",
    comprobante: "",
    recurrente: false,
    fecha_vencimiento: "",
    afecta_caja: true,
    tasa_bs: ""
  });

  // Detectar moneda según método de pago para guardar referencia
  const getMonedaMetodo = (metodo) => {
    if (metodo === 'nequi_cop') return { simbolo: '₡', nombre: 'COP' };
    if (metodo === 'tarjeta_bs' || metodo === 'pago_movil_bs') return { simbolo: 'Bs', nombre: 'VES' };
    return { simbolo: '$', nombre: 'USD' };
  };

  const esMetodoBs = formData.metodo_pago === 'tarjeta_bs' || formData.metodo_pago === 'pago_movil_bs';

  // Cargar datos cuando se edita
  useEffect(() => {
    if (gasto) {
      setFormData({
        fecha_gasto: gasto.fecha_gasto 
          ? format(new Date(gasto.fecha_gasto), "yyyy-MM-dd'T'HH:mm")
          : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        descripcion: gasto.descripcion || "",
        categoria: gasto.categoria || "Otros",
        monto: gasto.monto || "",
        metodo_pago: gasto.metodo_pago || "efectivo_usd",
        comprobante: gasto.comprobante || "",
        recurrente: gasto.recurrente || false,
        afecta_caja: gasto.afecta_caja !== undefined ? gasto.afecta_caja : true,
        fecha_vencimiento: gasto.fecha_vencimiento 
          ? format(new Date(gasto.fecha_vencimiento), "yyyy-MM-dd")
          : ""
      });
    }
  }, [gasto]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.descripcion.trim()) {
      alert("La descripción es requerida");
      return;
    }

    const montoNum = parseFloat(formData.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    // Obtener moneda para referencia
    const moneda = getMonedaMetodo(formData.metodo_pago);

    // Preparar datos para enviar (siempre en USD)
    const dataToSubmit = {
      fecha_gasto: new Date(formData.fecha_gasto).toISOString(),
      descripcion: formData.descripcion.trim(),
      categoria: formData.categoria,
      monto: montoNum,
      metodo_pago: formData.metodo_pago,
      moneda_original: moneda.nombre,
      monto_original: montoNum,
      tasa_cambio: 1,
      comprobante: formData.comprobante.trim(),
      recurrente: formData.recurrente,
      afecta_caja: formData.afecta_caja
    };

    // Si es método Bs, agregar tasa al comprobante
    if (esMetodoBs && formData.tasa_bs) {
      dataToSubmit.comprobante = `Tasa Bs: ${formData.tasa_bs}${dataToSubmit.comprobante ? ' | ' + dataToSubmit.comprobante : ''}`;
    }

    // Solo incluir fecha_vencimiento si tiene valor
    if (formData.fecha_vencimiento) {
      dataToSubmit.fecha_vencimiento = formData.fecha_vencimiento;
    }

    onSubmit(dataToSubmit);
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
        <CardTitle className="text-xl">
          {gasto ? "Editar Gasto" : "Registrar Nuevo Gasto"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_gasto">Fecha y Hora *</Label>
              <Input
                id="fecha_gasto"
                type="datetime-local"
                value={formData.fecha_gasto}
                onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto ({esMetodoBs ? 'Bs' : 'en USD'}) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {esMetodoBs ? 'Bs' : '$'}
                </span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  required
                  placeholder="0.00"
                  className={`pl-10 ${esMetodoBs ? 'bg-yellow-50 border-yellow-300' : ''}`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {esMetodoBs ? 'Ingrese el monto en Bolívares' : 'Ingrese el monto en dólares'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alquiler">Alquiler</SelectItem>
                  <SelectItem value="Servicios Básicos">Servicios Básicos</SelectItem>
                  <SelectItem value="Nómina">Nómina</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Impuestos">Impuestos</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo_pago">💳 Método de Pago *</Label>
              <Select
                value={formData.metodo_pago}
                onValueChange={(value) => setFormData({ ...formData, metodo_pago: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo_usd">💵 Efectivo USD</SelectItem>
                  <SelectItem value="binance_usd">📱 Binance</SelectItem>
                  <SelectItem value="zinli_usd">📱 Zinli</SelectItem>
                  <SelectItem value="paypal_usd">🌐 PayPal</SelectItem>
                  <SelectItem value="zelle_usd">🏦 Zelle</SelectItem>
                  <SelectItem value="nequi_cop">📱 Nequi</SelectItem>
                  <SelectItem value="tarjeta_bs">💳 Tarjeta Bs</SelectItem>
                  <SelectItem value="pago_movil_bs">📱 Pago Móvil</SelectItem>
                  <SelectItem value="otro">🔹 Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
                placeholder="Describe el gasto..."
                rows={3}
              />
            </div>

            {esMetodoBs && (
              <div className="space-y-2">
                <Label htmlFor="tasa_bs">Tasa Bs del día</Label>
                <Input
                  id="tasa_bs"
                  type="number"
                  step="0.01"
                  value={formData.tasa_bs}
                  onChange={(e) => setFormData({ ...formData, tasa_bs: e.target.value })}
                  placeholder="Ej: 55.50"
                  className="bg-yellow-50 border-yellow-300"
                />
                <p className="text-xs text-gray-500">Esta tasa se guardará en el comprobante</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comprobante">Número de Comprobante</Label>
              <Input
                id="comprobante"
                value={formData.comprobante}
                onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                placeholder="Factura #"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="recurrente">Gasto Recurrente (Fijo Mensual)</Label>
                  <p className="text-sm text-gray-500">Marca si es un gasto que se repite cada mes</p>
                </div>
                <Switch
                  id="recurrente"
                  checked={formData.recurrente}
                  onCheckedChange={(checked) => setFormData({ ...formData, recurrente: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="afecta_caja">Afecta Flujo de Caja</Label>
                  <p className="text-sm text-gray-500">Incluir en reportes de entrada/salida</p>
                </div>
                <Switch
                  id="afecta_caja"
                  checked={formData.afecta_caja}
                  onCheckedChange={(checked) => setFormData({ ...formData, afecta_caja: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-gray-50">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Guardando..." : "Guardar Gasto"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}