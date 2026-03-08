import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChefHat, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// URL del API - usa variable de entorno o fallback relativo
const API_URL = import.meta.env.VITE_API_URL || "/api";

const LS_KEY_SESSION = "empleado_sesion";

function redirectByRole(navigate, rol) {
  const destinos = {
    mesero: "Comandas",
    cocinero: "Comandas",
    cajero: "ProcesarVenta",
    administrador: "Dashboard",
  };
  const page = destinos[(rol || "administrador").toLowerCase()] || "Dashboard";
  navigate(createPageUrl(page), { replace: true });
}

export default function Acceso() {
  const navigate = useNavigate();

  // Estado general
  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form login
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");

  // Form register
  const [nombreReg, setNombreReg] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [passwordReg, setPasswordReg] = useState("");
  const [rolReg, setRolReg] = useState("administrador");

  // Si ya hay sesión, redirigir
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY_SESSION);
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user?.rol) {
          redirectByRole(navigate, user.rol);
        }
      } catch {}
    }
  }, [navigate]);

  const onRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const nombre = (nombreReg || "").trim();
    const email = (emailReg || "").trim().toLowerCase();
    const password = passwordReg || "";
    const rol = (rolReg || "administrador").toLowerCase();

    if (!nombre || !email || !password) {
      toast.error("Completa nombre, correo y contraseña");
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nombre, rol }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Error al registrar");
        setLoading(false);
        return;
      }

      // Login automático tras registro
      localStorage.setItem(LS_KEY_SESSION, JSON.stringify(data));
      toast.success("Usuario registrado correctamente");
      redirectByRole(navigate, data.rol);
    } catch (err) {
      console.error("Register error:", err);
      toast.error("Error de conexión");
      setLoading(false);
    }
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = (emailLogin || "").trim().toLowerCase();
    const password = passwordLogin || "";

    if (!email || !password) {
      toast.error("Ingresa tu correo y contraseña");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Credenciales incorrectas");
        setLoading(false);
        return;
      }

      localStorage.setItem(LS_KEY_SESSION, JSON.stringify(data));
      toast.success(`Bienvenido/a ${data.nombre}`);
      redirectByRole(navigate, data.rol);
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Error de conexión");
      setLoading(false);
    }
  };

  const Initials = useMemo(() => {
    const name = (nombreReg || "Usuario").trim();
    const ch = name[0] || "?";
    return ch.toUpperCase();
  }, [nombreReg]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 sm:p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <ChefHat className="w-12 h-12 text-amber-600" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center">
              Stop Time
            </CardTitle>
            <p className="text-amber-100 text-center text-sm sm:text-base">
              Sistema de Gestión de Restaurante
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {mode === "register" ? (
            <form onSubmit={onRegister} className="space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-bold">Registro de Usuario</h2>
                <p className="text-sm text-slate-600">Crea tu cuenta para acceder al sistema</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input 
                  id="nombre" 
                  value={nombreReg} 
                  onChange={(e) => setNombreReg(e.target.value)} 
                  placeholder="Ej: Juan Pérez" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={emailReg} 
                  onChange={(e) => setEmailReg(e.target.value)} 
                  placeholder="admin@ejemplo.com" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    value={passwordReg} 
                    onChange={(e) => setPasswordReg(e.target.value)} 
                    placeholder="Mínimo 4 caracteres" 
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
                <select 
                  value={rolReg}
                  onChange={(e) => setRolReg(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-white"
                >
                  <option value="administrador">Administrador</option>
                  <option value="cajero">Cajero</option>
                  <option value="mesero">Mesero</option>
                  <option value="cocinero">Cocinero</option>
                </select>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base font-semibold"
              >
                {loading ? "Registrando..." : <><UserPlus className="w-5 h-5 mr-2" /> Registrar y entrar</>}
              </Button>

              <p className="text-center text-sm text-slate-600">
                ¿Ya tienes cuenta?{" "}
                <button 
                  type="button"
                  onClick={() => { setMode("login"); setShowPassword(false); }}
                  className="text-amber-600 hover:underline font-medium"
                >
                  Iniciar sesión
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={onLogin} className="space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-bold">Iniciar sesión</h2>
                <p className="text-sm text-slate-600">Ingresa tus credenciales</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-login">Correo</Label>
                <Input 
                  id="email-login" 
                  type="email" 
                  value={emailLogin} 
                  onChange={(e) => setEmailLogin(e.target.value)} 
                  placeholder="correo@ejemplo.com" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-login">Contraseña</Label>
                <div className="relative">
                  <Input 
                    id="password-login" 
                    type={showPassword ? "text" : "password"}
                    value={passwordLogin} 
                    onChange={(e) => setPasswordLogin(e.target.value)} 
                    placeholder="Tu contraseña" 
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

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base font-semibold"
              >
                {loading ? "Ingresando..." : <><LogIn className="w-5 h-5 mr-2" /> Ingresar</>}
              </Button>

              <p className="text-center text-sm text-slate-600">
                ¿No tienes cuenta?{" "}
                <button 
                  type="button"
                  onClick={() => { setMode("register"); setShowPassword(false); }}
                  className="text-amber-600 hover:underline font-medium"
                >
                  Regístrate
                </button>
              </p>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2025 Stop Time - Todos los derechos reservados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
