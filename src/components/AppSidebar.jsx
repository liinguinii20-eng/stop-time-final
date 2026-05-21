import { 
  Home, 
  Utensils, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package,
  ChefHat,
  LogOut,
  ClipboardList,
  FileText,
  CreditCard,
  Tags,
  Truck,
  CookingPot,
  AlertTriangle,
  Landmark,
  Shield,
  RefreshCw
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import CalculadoraTasas from "./CalculadoraTasas"

// Importar funciones de control de acceso
import { getCurrentUser, canAccessPage } from "@/lib/roles"

// Configuración de los links del menú - cada item indica qué roles pueden verlo
const menuItems = {
  administracion: [
    { title: "Inicio", url: "/dashboard", icon: Home, permission: 'Dashboard' },
    { title: "Ventas", url: "/ventas", icon: ShoppingCart, permission: 'ProcesarVenta' },
    { title: "Comandas", url: "/comandas", icon: Utensils, permission: 'Comandas' },
    { title: "Platos & Sushi", url: "/platos", icon: ChefHat, permission: 'Platos' },
    { title: "Inventario", url: "/ingredientes", icon: Package, permission: 'Ingredientes' },
    { title: "Gastos", url: "/gastos", icon: DollarSign, permission: 'Gastos' },
    { title: "Personal", url: "/personal", icon: Users, permission: 'Personal' },
    { title: "Adelantos", url: "/adelantos", icon: DollarSign, permission: 'Adelantos' },
  ],
  recetas: [
    { title: "Recetas Primarias", url: "/recetas-primarias", icon: ClipboardList, permission: 'RecetasPrimarias' },
    { title: "Recetas Secundarias", url: "/recetas-secundarias", icon: ClipboardList, permission: 'RecetasSecundarias' },
  ],
  reportes: [
    { title: "General", url: "/reportes", icon: FileText, permission: 'Reportes' },
    { title: "Diarios", url: "/reportes-diarios", icon: FileText, permission: 'ReportesDiarios' },
    { title: "Mensuales", url: "/reportes-mensuales", icon: FileText, permission: 'ReporteMensual' },
  ],
  contabilidad: [
    { title: "Cuentas por Cobrar", url: "/cuentas-por-cobrar", icon: CreditCard, permission: 'CuentasPorCobrar' },
    { title: "Categorías de Gastos", url: "/categorias-gastos", icon: Tags, permission: 'CategoriasGastos' },
    { title: "Compras", url: "/compras-ingredientes", icon: Truck, permission: 'ComprasIngredientes' },
  ],
  cocina: [
    { title: "Vista de Cocina", url: "/cocina", icon: CookingPot, permission: 'Cocina' },
    { title: "Alertas de Stock", url: "/alertas", icon: AlertTriangle, permission: 'Alertas' },
  ],
  config: [
    { title: "Tasas de Cambio", url: "/gestion-tasas", icon: Landmark, permission: 'GestionTasas' },
    { title: "Depuración y Cierre", url: "/configuracion-retencion", icon: RefreshCw, permission: 'ConfiguracionRetencion' },
    { title: "Admin Reset", url: "/admin-reset", icon: Shield, permission: 'AdminReset' },
  ],
};

const SidebarItems = ({ items }) => {
  const location = useLocation();
  // Filtrar items según permisos del usuario
  const user = getCurrentUser();
  const userRole = user?.rol?.toLowerCase();
  
  const visibleItems = items.filter(item => {
    // Si el usuario es admin, puede ver todo
    if (userRole === 'administrador') return true;
    // Verificar permiso específico para el item
    return item.permission && canAccessPage(item.permission, userRole);
  });
  
  if (visibleItems.length === 0) return null;
  
  return (
    <SidebarMenu>
      {visibleItems.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton 
            asChild 
            isActive={location.pathname === item.url}
            tooltip={item.title}
            className="hover:bg-red-50 hover:text-red-700 transition-colors py-5"
          >
            <Link to={item.url} className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${location.pathname === item.url ? 'text-red-600' : 'text-slate-500'}`} />
              <span className="font-medium text-slate-700">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

export function AppSidebar() {
  const navigate = useNavigate()
  const user = getCurrentUser();
  const userRole = user?.rol?.toLowerCase();
  const { collapsed } = useSidebar();

  // Función para verificar si debe mostrar un grupo
  const shouldShowGroup = (items) => {
    if (userRole === 'administrador') return true;
    return items.some(item => !item.permission || canAccessPage(item.permission, userRole));
  };

  const handleLogout = () => {
    // Limpiamos la sesión (opcional) y volvemos al acceso
    localStorage.removeItem("empleado_sesion")
    navigate("/")
  }

  const tieneAccesoCalculadora = userRole && ["administrador", "cajero", "mesero"].includes(userRole);

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200">
      {/* Cabecera del Sidebar */}
      <SidebarHeader className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white font-bold">
            ST
          </div>
          <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="font-bold leading-none text-slate-900">Stop Time</span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Sushi & Bar</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Contenido principal del menú */}
      <SidebarContent>
        {shouldShowGroup(menuItems.administracion) && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={menuItems.administracion} />
          </SidebarGroupContent>
        </SidebarGroup>
        )}
        {shouldShowGroup(menuItems.recetas) && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Recetas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={menuItems.recetas} />
          </SidebarGroupContent>
        </SidebarGroup>
        )}
        {shouldShowGroup(menuItems.reportes) && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Reportes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={menuItems.reportes} />
          </SidebarGroupContent>
        </SidebarGroup>
        )}
        {shouldShowGroup(menuItems.contabilidad) && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Contabilidad</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={menuItems.contabilidad} />
          </SidebarGroupContent>
        </SidebarGroup>
        )}
        {shouldShowGroup(menuItems.cocina) && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Cocina</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={menuItems.cocina} />
          </SidebarGroupContent>
        </SidebarGroup>
        )}
        {shouldShowGroup(menuItems.config) && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Configuración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={menuItems.config} />
          </SidebarGroupContent>
        </SidebarGroup>
        )}
      </SidebarContent>

      {/* Pie del Sidebar (Cerrar Sesión / Usuario) */}
      <SidebarFooter className={`p-4 ${collapsed ? "flex flex-col items-center gap-4" : "space-y-4"}`}>
        {tieneAccesoCalculadora && (
          <CalculadoraTasas collapsed={collapsed} />
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="group-data-[collapsible=icon]:hidden font-medium">Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
