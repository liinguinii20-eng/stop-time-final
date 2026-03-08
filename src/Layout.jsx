import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  ChefHat,
  DollarSign,
  Users,
  LogOut,
  FileText
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    roles: ['administrador', 'cajero', 'visualizador']
  },
  {
    title: "Comandas",
    url: createPageUrl("Comandas"),
    icon: ChefHat,
    roles: ['mesero', 'administrador', 'cajero']
  },
  {
    title: "Cocina",
    url: createPageUrl("Cocina"),
    icon: ChefHat,
    roles: ['cocinero']
  },
  {
    title: "Ingredientes",
    url: createPageUrl("Ingredientes"),
    icon: Package,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Recetas Primarias",
    url: createPageUrl("RecetasPrimarias"),
    icon: ChefHat,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Recetas Secundarias",
    url: createPageUrl("RecetasSecundarias"),
    icon: ChefHat,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Platos",
    url: createPageUrl("Platos"),
    icon: UtensilsCrossed,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Compras",
    url: createPageUrl("ComprasIngredientes"),
    icon: ShoppingCart,
    roles: ['administrador', 'cajero', 'visualizador']
  },
  {
    title: "Gastos",
    url: createPageUrl("Gastos"),
    icon: DollarSign,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Adelantos",
    url: createPageUrl("Adelantos"),
    icon: DollarSign,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Reportes",
    url: createPageUrl("Reportes"),
    icon: TrendingUp,
    roles: ['administrador', 'cajero', 'visualizador']
  },
  {
    title: "Estado de Cuenta",
    url: createPageUrl("EstadosCuenta"),
    icon: TrendingUp,
    roles: ['administrador', 'cajero', 'visualizador']
  },
  {
    title: "Alertas de Stock",
    url: createPageUrl("Alertas"),
    icon: AlertTriangle,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Empleados",
    url: createPageUrl("Empleados"),
    icon: Users,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Tasas de Cambio",
    url: createPageUrl("GestionTasas"),
    icon: DollarSign,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Reportes Diarios",
    url: createPageUrl("ReportesDiarios"),
    icon: TrendingUp,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Reporte Mensual",
    url: createPageUrl("ReporteMensual"),
    icon: TrendingUp,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Cuentas por Cobrar",
    url: createPageUrl("CuentasPorCobrar"),
    icon: FileText,
    roles: ['administrador', 'cajero', 'visualizador']
  },
  {
    title: "Retención de Datos",
    url: createPageUrl("ConfiguracionRetencion"),
    icon: DollarSign,
    roles: ['administrador', 'visualizador']
  },
  {
    title: "Reset Sistema",
    url: createPageUrl("AdminReset"),
    icon: AlertTriangle,
    roles: ['administrador']
  },
  ];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [empleadoSesion, setEmpleadoSesion] = useState(null);
  const [tasaCOPActual, setTasaCOPActual] = useState(null);
  const [tasaUSDActual, setTasaUSDActual] = useState(null);

  useEffect(() => {
    const empleado = localStorage.getItem('empleado_sesion');
    if (empleado) {
      const empleadoData = JSON.parse(empleado);
      setEmpleadoSesion(empleadoData);
      
      // Redirigir cocineros directamente a Cocina
      if (empleadoData.rol === 'cocinero' && currentPageName !== "Cocina") {
        navigate(createPageUrl("Cocina"));
      }
    } else if (currentPageName !== "Acceso") {
      // Si no hay sesión, redirigir a login (excepto si ya está en Acceso)
      navigate(createPageUrl("Acceso"));
    }

    // Cargar tasas iniciales
    const tasaCOPGuardada = localStorage.getItem('tasa_cop_actual');
    if (tasaCOPGuardada) {
      setTasaCOPActual(parseFloat(tasaCOPGuardada));
    }

    const tasaUSDGuardada = localStorage.getItem('tasa_usd_final');
    if (tasaUSDGuardada) {
      setTasaUSDActual(parseFloat(tasaUSDGuardada));
    }

    // Listener para cambios en tiempo real
    const handleStorageChange = () => {
      const nuevaTasaCOP = localStorage.getItem('tasa_cop_actual');
      if (nuevaTasaCOP) {
        setTasaCOPActual(parseFloat(nuevaTasaCOP));
      }

      const nuevaTasaUSD = localStorage.getItem('tasa_usd_final');
      if (nuevaTasaUSD) {
        setTasaUSDActual(parseFloat(nuevaTasaUSD));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate, currentPageName]);

  const handleMenuClick = () => {
    // Solo cerrar el sidebar en dispositivos móviles
    if (window.innerWidth < 768) {
      const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]');
      if (sidebarTrigger) {
        sidebarTrigger.click();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('empleado_sesion');
    navigate(createPageUrl("Acceso"));
  };

  // Filtrar menú según rol
  const menuFiltrado = navigationItems.filter(item => 
    !item.roles || item.roles.includes(empleadoSesion?.rol)
  );

  // Si es página de Acceso, mostrar sin Layout
  if (currentPageName === "Acceso") {
    return <>{children}</>;
  }

  // Si no hay sesión en otras páginas, no mostrar nada (el redirect ya se ejecutó)
  if (!empleadoSesion) return null;

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --color-primary: #C5A572;
            --color-primary-dark: #9B7E54;
            --color-bg: #FAF9F6;
            --color-accent: #8B6F47;
          }
          
          .bg-primary { background-color: var(--color-primary); }
          .bg-primary-dark { background-color: var(--color-primary-dark); }
          .text-primary { color: var(--color-primary); }
          .border-primary { border-color: var(--color-primary); }
        `}
      </style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl flex items-center justify-center shadow-lg">
                <ChefHat className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900">Stop Time</h2>
                <p className="text-xs text-gray-500">Sistema de Gestión</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                Navegación
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuFiltrado.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-amber-50 hover:text-amber-900 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-amber-100 text-amber-900 font-medium' : ''
                        }`}
                      >
                        <Link 
                          to={item.url} 
                          className="flex items-center gap-3 px-3 py-2.5"
                          onClick={handleMenuClick}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4 space-y-3">
            {tasaUSDActual && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-3 mx-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-900">Tasa USD (+16%)</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">
                    Bs {tasaUSDActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {tasaCOPActual && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mx-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">Tasa COP</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">
                    ₡ {tasaCOPActual.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {empleadoSesion?.nombre_completo.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{empleadoSesion?.nombre_completo}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{empleadoSesion?.rol}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold">Stop Time</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
} 