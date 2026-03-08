import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "sonner";

// --- ERROR BOUNDARY GLOBAL PARA EVITAR PANTALLA EN BLANCO ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Runtime error:", error, info);
  }
  limpiarSesion = () => {
    try {
      localStorage.removeItem('empleado_sesion');
    } catch {}
    window.location.href = '/';
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Se produjo un error en la aplicación</h1>
          <p style={{ color: '#475569', marginBottom: 12 }}>
            Si estabas autenticado, la sesión pudo quedar en un estado inválido.
          </p>
          <button onClick={this.limpiarSesion} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#ef4444', color: 'white', border: 0, borderRadius: 6,
            padding: '8px 12px', cursor: 'pointer'
          }}>Limpiar sesión y volver al inicio</button>
          <pre style={{
            marginTop: 16, background: '#f8fafc', color: '#0f172a',
            padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 300
          }}>{String(this.state.error?.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- IMPORTACIÓN DE PÁGINAS ---
import Acceso from "./pages/Acceso";
import Dashboard from "./pages/Dashboard";
import Platos from "./pages/Platos";
import Ventas from "./pages/Ventas";
import Comandas from "./pages/Comandas";
import ProcesarVenta from "./pages/ProcesarVenta";
import Ingredientes from "./pages/Ingredientes";
import Gastos from "./pages/Gastos";
import Empleados from "./pages/Empleados";
import Adelantos from './pages/Adelantos';
import AdminReset from './pages/AdminReset';
import Alertas from './pages/Alertas';
import CategoriasGastos from './pages/CategoriasGastos';
import Cocina from './pages/Cocina';
import ComprasIngredientes from './pages/ComprasIngredientes';
import ConfiguracionRetencion from './pages/ConfiguracionRetencion';
import CuentasPorCobrar from './pages/CuentasPorCobrar';
import DiagnosticoCompleto from './pages/DiagnosticoCompleto';
import EstadoCuentaDetalle from './pages/EstadoCuentaDetalle';
import EstadosCuenta from './pages/EstadosCuenta';
import GestionTasas from './pages/GestionTasas';
import HerramientaManual from './pages/HerramientaManual';
import Home from './pages/Home';
import ImprimirComanda from './pages/ImprimirComanda';
import InvitarNestor from './pages/InvitarNestor';
import RecetasPrimarias from './pages/RecetasPrimarias';
import RecetasSecundarias from './pages/RecetasSecundarias';
import ReparadorCOP from './pages/ReparadorCOP';
import ReporteDetalle from './pages/ReporteDetalle';
import ReporteEntradaSalidaDetalle from './pages/ReporteEntradaSalidaDetalle';
import ReporteMensual from './pages/ReporteMensual';
import Reportes from './pages/Reportes';
import ReportesDiarios from './pages/ReportesDiarios';
import ReportesEntradaSalida from './pages/ReportesEntradaSalida';
import ReportesMetodosPago from './pages/ReportesMetodosPago';
import SolucionManual from './pages/SolucionManual';

// --- COMPONENTE DE DISEÑO PROTEGIDO ---
const ProtectedLayout = ({ children }) => {
  // Verificamos si hay un usuario en el LocalStorage
  const isAuthenticated = localStorage.getItem("empleado_sesion");

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        {/* Tu nuevo AppSidebar arreglado */}
        <AppSidebar />
        
        <SidebarInset className="flex flex-col flex-1">
          {/* Barra Superior (Header) */}
          <header className="flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-6 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                Sistema de Gestión - Stop Time Sushi
              </h2>
            </div>
          </header>
          
          {/* Contenido de la página */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  return (
    <ErrorBoundary>
    <Router>
      {/* Notificaciones globales */}
      <Toaster position="top-right" richColors closeButton />
      
      <Routes>
        {/* Ruta Pública */}
        <Route path="/" element={<Acceso />} />

        {/* Rutas Privadas (Protegidas) */}
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/ventas" element={<ProtectedLayout><Ventas /></ProtectedLayout>} />
        <Route path="/comandas" element={<ProtectedLayout><Comandas /></ProtectedLayout>} />
        <Route path="/procesarventa" element={<ProtectedLayout><ProcesarVenta /></ProtectedLayout>} />
        <Route path="/platos" element={<ProtectedLayout><Platos /></ProtectedLayout>} />
        <Route path="/ingredientes" element={<ProtectedLayout><Ingredientes /></ProtectedLayout>} />
        <Route path="/gastos" element={<ProtectedLayout><Gastos /></ProtectedLayout>} />
        <Route path="/empleados" element={<ProtectedLayout><Empleados /></ProtectedLayout>} />
        <Route path="/adelantos" element={<ProtectedLayout><Adelantos /></ProtectedLayout>} />
        <Route path="/recetas-primarias" element={<ProtectedLayout><RecetasPrimarias /></ProtectedLayout>} />
        <Route path="/recetas-secundarias" element={<ProtectedLayout><RecetasSecundarias /></ProtectedLayout>} />
        <Route path="/reportes" element={<ProtectedLayout><Reportes /></ProtectedLayout>} />
        <Route path="/reportes-diarios" element={<ProtectedLayout><ReportesDiarios /></ProtectedLayout>} />
        <Route path="/reportes-mensuales" element={<ProtectedLayout><ReporteMensual /></ProtectedLayout>} />
        <Route path="/reportes-entrada-salida" element={<ProtectedLayout><ReportesEntradaSalida /></ProtectedLayout>} />
        <Route path="/reportes-metodos-pago" element={<ProtectedLayout><ReportesMetodosPago /></ProtectedLayout>} />
        <Route path="/cuentas-por-cobrar" element={<ProtectedLayout><CuentasPorCobrar /></ProtectedLayout>} />
        <Route path="/categorias-gastos" element={<ProtectedLayout><CategoriasGastos /></ProtectedLayout>} />
        <Route path="/compras-ingredientes" element={<ProtectedLayout><ComprasIngredientes /></ProtectedLayout>} />
        <Route path="/cocina" element={<ProtectedLayout><Cocina /></ProtectedLayout>} />
        <Route path="/alertas" element={<ProtectedLayout><Alertas /></ProtectedLayout>} />
        <Route path="/gestion-tasas" element={<ProtectedLayout><GestionTasas /></ProtectedLayout>} />
        <Route path="/configuracion-retencion" element={<ProtectedLayout><ConfiguracionRetencion /></ProtectedLayout>} />
        {/* Rutas sin sidebar */}
        <Route path="/admin-reset" element={<ProtectedLayout><AdminReset /></ProtectedLayout>} />
        <Route path="/diagnostico-completo" element={<ProtectedLayout><DiagnosticoCompleto /></ProtectedLayout>} />
        <Route path="/estado-cuenta-detalle" element={<ProtectedLayout><EstadoCuentaDetalle /></ProtectedLayout>} />
        <Route path="/estados-cuenta" element={<ProtectedLayout><EstadosCuenta /></ProtectedLayout>} />
        <Route path="/herramienta-manual" element={<ProtectedLayout><HerramientaManual /></ProtectedLayout>} />
        <Route path="/home" element={<ProtectedLayout><Home /></ProtectedLayout>} />
        <Route path="/imprimir-comanda" element={<ProtectedLayout><ImprimirComanda /></ProtectedLayout>} />
        <Route path="/invitar-nestor" element={<ProtectedLayout><InvitarNestor /></ProtectedLayout>} />
        <Route path="/reparador-cop" element={<ProtectedLayout><ReparadorCOP /></ProtectedLayout>} />
        <Route path="/reporte-detalle" element={<ProtectedLayout><ReporteDetalle /></ProtectedLayout>} />
        <Route path="/reporte-entrada-salida-detalle" element={<ProtectedLayout><ReporteEntradaSalidaDetalle /></ProtectedLayout>} />
        <Route path="/solucion-manual" element={<ProtectedLayout><SolucionManual /></ProtectedLayout>} />

        {/* Si no encuentra la ruta, vuelve al acceso */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;