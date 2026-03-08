import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChefHat, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

// Utilidades locales de almacenamiento
const LS_KEY_USERS = "st_sushi_Usuario";
const LS_KEY_SESSION = "empleado_sesion";

function readUsers() {
  try {
    const raw = localStorage.getItem(LS_KEY_USERS);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(LS_KEY_USERS, JSON.stringify(users || []));
}

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
  const [users, setUsers] = useState(() => readUsers());
  const [mode, setMode] = useState(() => (readUsers().length === 0 ? "register" : "login"));

  // Form login
  const [emailLogin, setEmailLogin] = useState("");

  // Form register
  const [nombreReg, setNombreReg] = useState("");
  const [emailReg, setEmailReg] = useState("");
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

  // Cambiar modo automáticamente si se crean usuarios
  useEffect(() => {
    if (users.length > 0 && mode === "register") {
      setMode("login");
    }
  }, [users, mode]);

  const onRegister = (e) => {
    e.preventDefault();
    const nombre = (nombreReg || "").trim();
    const email = (emailReg || "").trim().toLowerCase();
    const rol = (rolReg || "administrador").toLowerCase();

    if (!nombre || !email) {
      toast.error("Completa nombre y correo");
      return;
    }

    const exists = users.some((u) => (u.email || "").toLowerCase() === email);
    if (exists) {
      toast.error("Ya existe un usuario con ese correo");
      return;
    }

    const nuevo = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36),
      nombre,
      email,
      rol,
      activo: true,
      created_date: new Date().toISOString(),
    };
    const updated = [nuevo, ...users];
    writeUsers(updated);
    setUsers(updated);

    localStorage.setItem(LS_KEY_SESSION, JSON.stringify(nuevo));
    toast.success("Usuario registrado y sesión iniciada");
    redirectByRole(navigate, rol);
  };

  const onLogin = (e) => {
    e.preventDefault();
    const email = (emailLogin || "").trim().toLowerCase();
    if (!email) {
      toast.error("Ingresa tu correo");
      return;
    }
    const user = users.find((u) => (u.email || "").toLowerCase() === email);
    if (!user) {
      toast.error("Usuario no encontrado");
      return;
    }
    if (user.activo === false) {
      toast.error("Usuario inactivo");
      return;
    }
    localStorage.setItem(LS_KEY_SESSION, JSON.stringify(user));
    toast.success(`Bienvenido/a ${user.nombre}`);
    redirectByRole(navigate, user.rol);
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
                <h2 className="text-xl font-bold">Registro de Administrador</h2>
                <p className="text-sm text-slate-600">Crea el primer usuario administrador</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" value={nombreReg} onChange={(e) => setNombreReg(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" value={emailReg} onChange={(e) => setEmailReg(e.target.value)} placeholder="admin@ejemplo.com" />
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <Input value={rolReg} disabled className="font-semibold" />
              </div>

              <Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base font-semibold">
                <UserPlus className="w-5 h-5 mr-2" /> Registrar y entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={onLogin} className="space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-bold">Iniciar sesión</h2>
                <p className="text-sm text-slate-600">Ingresa tu correo registrado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-login">Correo</Label>
                <Input id="email-login" type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>

              <Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base font-semibold">
                <LogIn className="w-5 h-5 mr-2" /> Ingresar
              </Button>

              {users.length === 0 && (
                <p className="text-xs text-slate-500 text-center">No hay usuarios. Cambiando a registro...</p>
              )}
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
