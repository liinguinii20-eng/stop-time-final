import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Loader2 } from "lucide-react";

export default function EmpleadoForm({ empleado, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    nombre_completo: "",
    usuario: "",
    email: "",
    rol: "mesero",
    activo: true,
  });

  useEffect(() => {
    if (empleado) setFormData(empleado);
  }, [empleado]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="mb-8 border-2 border-amber-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <CardHeader className="flex flex-row items-center justify-between bg-amber-50/50">
        <CardTitle className="text-xl font-bold text-amber-900">
          {empleado ? "📝 Editar Empleado" : "👤 Nuevo Empleado"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input 
                required 
                value={formData.nombre_completo} 
                onChange={e => setFormData({...formData, nombre_completo: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Usuario (@)</Label>
              <Input 
                required 
                value={formData.usuario} 
                onChange={e => setFormData({...formData, usuario: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                required 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.rol} onValueChange={v => setFormData({...formData, rol: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mesero">Mesero</SelectItem>
                  <SelectItem value="cocinero">Cocinero</SelectItem>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox id="activo" checked={formData.activo} onCheckedChange={c => setFormData({...formData, activo: c})} />
            <Label htmlFor="activo">Empleado activo</Label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {empleado ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}