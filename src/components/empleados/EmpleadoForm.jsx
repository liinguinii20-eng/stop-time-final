import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Loader2, Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function EmpleadoForm({ empleado, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    nombre_completo: "",
    usuario: "",
    email: "",
    password: "",
    rol: "mesero",
    activo: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    if (empleado) {
      setFormData({ ...empleado, password: "" }); // Don't show existing password
    }
  }, [empleado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si es nuevo empleado o tiene contraseña, crear/actualizar usuario en la API
    if (formData.password && formData.email) {
      setSavingUser(true);
      try {
        const endpoint = empleado?.id ? '/api/usuarios' : '/api/auth/register';
        const method = empleado?.id ? 'PUT' : 'POST';
        
        const res = await fetch(`${API_URL}${endpoint}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: empleado?.id,
            email: formData.email,
            password: formData.password,
            nombre: formData.nombre_completo,
            rol: formData.rol,
            activo: formData.activo
          }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          toast.error(data.error || "Error al guardar usuario");
          setSavingUser(false);
          return;
        }
        
        toast.success("Usuario guardado correctamente");
      } catch (err) {
        console.error("Error saving user:", err);
        toast.error("Error de conexión");
        setSavingUser(false);
        return;
      }
      setSavingUser(false);
    }
    
    // Continuar con el submit normal (local storage)
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
              <Label>Nombre Completo *</Label>
              <Input 
                required 
                value={formData.nombre_completo} 
                onChange={e => setFormData({...formData, nombre_completo: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Usuario (login) *</Label>
              <Input 
                required 
                value={formData.usuario} 
                onChange={e => setFormData({...formData, usuario: e.target.value})} 
                placeholder="Para iniciar sesión"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email" 
                required 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>
                Contraseña {empleado ? "(dejar vacío para mantener)" : "*"}
              </Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  placeholder={empleado ? "••••••••" : "Mínimo 4 caracteres"}
                  required={!empleado}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
            <Button type="submit" disabled={isLoading || savingUser} className="bg-amber-600 hover:bg-amber-700">
              {(isLoading || savingUser) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {empleado ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
