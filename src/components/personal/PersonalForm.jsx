import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Loader2, Eye, EyeOff, DollarSign, Briefcase, Phone, CreditCard } from "lucide-react";

export default function PersonalForm({ persona, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    nombre: "",
    usuario: "",
    password: "",
    rol: "mesero",
    activo: true,
    salario_base: "",
    cargo: "",
    cedula: "",
    telefono: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (persona) {
      setFormData({
        nombre: persona.nombre || "",
        usuario: persona.usuario || "",
        password: "",
        rol: persona.rol || "mesero",
        activo: persona.activo !== false,
        salario_base: persona.salario_base ?? "",
        cargo: persona.cargo || "",
        cedula: persona.cedula || "",
        telefono: persona.telefono || "",
      });
    } else {
      setFormData({
        nombre: "",
        usuario: "",
        password: "",
        rol: "mesero",
        activo: true,
        salario_base: "",
        cargo: "",
        cedula: "",
        telefono: "",
      });
    }
    setErrors({});
  }, [persona]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres";
    }

    if (!formData.usuario.trim()) {
      newErrors.usuario = "El usuario es obligatorio";
    } else if (formData.usuario.trim().length < 3) {
      newErrors.usuario = "El usuario debe tener al menos 3 caracteres";
    }

    // Validar contraseña solo si es nuevo usuario o se está cambiando
    if (!persona || formData.password.trim() !== "") {
      if (formData.password.length < 6) {
        newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      }
    }

    // Validar salario si se ingresó
    if (formData.salario_base !== "" && formData.salario_base !== null) {
      const salario = parseFloat(formData.salario_base);
      if (isNaN(salario) || salario < 0) {
        newErrors.salario_base = "El salario debe ser un número positivo";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const dataToSubmit = { ...formData };
    // Si es edición y no se cambió la contraseña, no enviar campo password
    if (persona && dataToSubmit.password.trim() === "") {
      delete dataToSubmit.password;
    }
    
    // Convertir salario a número
    if (dataToSubmit.salario_base !== "" && dataToSubmit.salario_base !== null) {
      dataToSubmit.salario_base = parseFloat(dataToSubmit.salario_base);
    } else {
      dataToSubmit.salario_base = 0;
    }

    // Limpiar campos vacíos opcionales
    if (!dataToSubmit.cargo?.trim()) dataToSubmit.cargo = null;
    if (!dataToSubmit.cedula?.trim()) dataToSubmit.cedula = null;
    if (!dataToSubmit.telefono?.trim()) dataToSubmit.telefono = null;
    
    onSubmit(dataToSubmit);
  };

  return (
    <Card className="mb-8 border-2 border-amber-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <CardHeader className="flex flex-row items-center justify-between bg-amber-50/50">
        <CardTitle className="text-xl font-bold text-amber-900">
          {persona ? "✏️ Editar Personal" : "👤 Nuevo Personal"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ─── SECCIÓN: DATOS DE ACCESO ────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Datos de Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input 
                  required 
                  className={errors.nombre ? "border-red-500 focus-visible:ring-red-500" : ""}
                  value={formData.nombre || ''} 
                  onChange={e => {
                    setFormData({...formData, nombre: e.target.value});
                    if (errors.nombre) setErrors({...errors, nombre: ""});
                  }} 
                  placeholder="Ej: Juan Pérez"
                />
                {errors.nombre && (
                  <p className="text-sm text-red-600 mt-1">{errors.nombre}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre de Usuario *</Label>
                <Input 
                  required 
                  className={errors.usuario ? "border-red-500 focus-visible:ring-red-500" : ""}
                  value={formData.usuario || ''} 
                  onChange={e => {
                    setFormData({...formData, usuario: e.target.value});
                    if (errors.usuario) setErrors({...errors, usuario: ""});
                  }} 
                  placeholder="Ej: jperez"
                />
                {errors.usuario && (
                  <p className="text-sm text-red-600 mt-1">{errors.usuario}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Contraseña {persona ? "(opcional - dejar vacío para no cambiar)" : "*"}
                </Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                    value={formData.password} 
                    onChange={e => {
                      setFormData({...formData, password: e.target.value});
                      if (errors.password) setErrors({...errors, password: ""});
                    }} 
                    placeholder={persona ? "Dejar vacío para mantener contraseña actual" : "Mínimo 6 caracteres"}
                    required={!persona}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={formData.rol} onValueChange={v => setFormData({...formData, rol: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="cajero">Cajero</SelectItem>
                    <SelectItem value="cocinero">Cocinero</SelectItem>
                    <SelectItem value="mesero">Mesero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ─── SECCIÓN: DATOS DE NÓMINA ────────────────────────── */}
          <div className="border-t pt-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Datos de Nómina
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-violet-500" />
                  Salario Base (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    className={`pl-7 ${errors.salario_base ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    value={formData.salario_base} 
                    onChange={e => {
                      setFormData({...formData, salario_base: e.target.value});
                      if (errors.salario_base) setErrors({...errors, salario_base: ""});
                    }} 
                    placeholder="0.00"
                  />
                </div>
                {errors.salario_base && (
                  <p className="text-sm text-red-600 mt-1">{errors.salario_base}</p>
                )}
                <p className="text-xs text-gray-400">Este monto se usará para calcular la nómina</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-violet-500" />
                  Cargo
                </Label>
                <Input 
                  value={formData.cargo || ''} 
                  onChange={e => setFormData({...formData, cargo: e.target.value})} 
                  placeholder="Ej: Chef, Barista, Cajero..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-violet-500" />
                  Cédula
                </Label>
                <Input 
                  value={formData.cedula || ''} 
                  onChange={e => setFormData({...formData, cedula: e.target.value})} 
                  placeholder="Ej: V-12345678"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-violet-500" />
                  Teléfono
                </Label>
                <Input 
                  value={formData.telefono || ''} 
                  onChange={e => setFormData({...formData, telefono: e.target.value})} 
                  placeholder="Ej: +58 412-1234567"
                />
              </div>
            </div>
          </div>

          {/* ─── ESTADO ──────────────────────────────────────────── */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox 
              id="activo" 
              checked={formData.activo} 
              onCheckedChange={c => setFormData({...formData, activo: c})} 
            />
            <Label htmlFor="activo" className="cursor-pointer">
              Cuenta activa (el usuario puede iniciar sesión)
            </Label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {persona ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
