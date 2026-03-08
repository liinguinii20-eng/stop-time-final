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
  Landmark
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
} from "@/components/ui/sidebar"

// Configuración de los links del menú
const adminItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Ventas", url: "/ventas", icon: ShoppingCart },
  { title: "Comandas", url: "/comandas", icon: Utensils },
  { title: "Platos & Sushi", url: "/platos", icon: ChefHat },
  { title: "Inventario", url: "/ingredientes", icon: Package },
  { title: "Gastos", url: "/gastos", icon: DollarSign },
  { title: "Personal", url: "/empleados", icon: Users },
  { title: "Adelantos", url: "/adelantos", icon: DollarSign },
];

const recetasItems = [
    { title: "Recetas Primarias", url: "/recetas-primarias", icon: ClipboardList },
    { title: "Recetas Secundarias", url: "/recetas-secundarias", icon: ClipboardList },
];

const reportesItems = [
    { title: "General", url: "/reportes", icon: FileText },
    { title: "Diarios", url: "/reportes-diarios", icon: FileText },
    { title: "Mensuales", url: "/reportes-mensuales", icon: FileText },
];

const contabilidadItems = [
    { title: "Cuentas por Cobrar", url: "/cuentas-por-cobrar", icon: CreditCard },
    { title: "Categorías de Gastos", url: "/categorias-gastos", icon: Tags },
    { title: "Compras", url: "/compras-ingredientes", icon: Truck },
];

const cocinaItems = [
    { title: "Vista de Cocina", url: "/cocina", icon: CookingPot },
    { title: "Alertas de Stock", url: "/alertas", icon: AlertTriangle },
];

const configItems = [
    { title: "Tasas de Cambio", url: "/gestion-tasas", icon: Landmark },
];

const SidebarItems = ({ items }) => {
  const location = useLocation();
  return (
    <SidebarMenu>
      {items.map((item) => (
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

  const handleLogout = () => {
    // Limpiamos la sesión (opcional) y volvemos al acceso
    localStorage.removeItem("empleado_sesion")
    navigate("/")
  }

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={adminItems} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Recetas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={recetasItems} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Reportes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={reportesItems} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Contabilidad</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={contabilidadItems} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Cocina</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={cocinaItems} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-bold px-4 mb-2">Configuración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarItems items={configItems} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Pie del Sidebar (Cerrar Sesión / Usuario) */}
      <SidebarFooter className="p-4">
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
