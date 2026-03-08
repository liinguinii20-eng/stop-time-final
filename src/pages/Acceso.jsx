import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChefHat, LogIn, Eye, EyeOff } from "lucide-react";
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

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = username.trim();
    const pass = password || "";

    if (!user || !pass) {
      toast.error("Ingresa usuario y contraseña");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user, password: pass }),
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
          <form onSubmit={onLogin} className="space-y-5">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold">Iniciar sesión</h2>
              <p className="text-sm text-slate-600">Ingresa tus credenciales</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="admin" 
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••"
                  autoComplete="current-password"
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
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2025 Stop Time - Todos los derechos reservados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
