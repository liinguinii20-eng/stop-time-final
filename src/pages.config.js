/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Acceso from './pages/Acceso';
import Adelantos from './pages/Adelantos';
import AdminReset from './pages/AdminReset';
import Alertas from './pages/Alertas';
import CategoriasGastos from './pages/CategoriasGastos';
import Cocina from './pages/Cocina';
import Comandas from './pages/Comandas';
import ComprasIngredientes from './pages/ComprasIngredientes';
import ConfiguracionRetencion from './pages/ConfiguracionRetencion';
import CuentasPorCobrar from './pages/CuentasPorCobrar';
import Dashboard from './pages/Dashboard';
import DiagnosticoCompleto from './pages/DiagnosticoCompleto';
import Empleados from './pages/Empleados';
import EstadoCuentaDetalle from './pages/EstadoCuentaDetalle';
import EstadosCuenta from './pages/EstadosCuenta';
import Gastos from './pages/Gastos';
import GestionTasas from './pages/GestionTasas';
import HerramientaManual from './pages/HerramientaManual';
import Home from './pages/Home';
import ImprimirComanda from './pages/ImprimirComanda';
import Ingredientes from './pages/Ingredientes';
import InvitarNestor from './pages/InvitarNestor';
import Platos from './pages/Platos';
import ProcesarVenta from './pages/ProcesarVenta';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "Acceso": Acceso,
    "Adelantos": Adelantos,
    "AdminReset": AdminReset,
    "Alertas": Alertas,
    "CategoriasGastos": CategoriasGastos,
    "Cocina": Cocina,
    "Comandas": Comandas,
    "ComprasIngredientes": ComprasIngredientes,
    "ConfiguracionRetencion": ConfiguracionRetencion,
    "CuentasPorCobrar": CuentasPorCobrar,
    "Dashboard": Dashboard,
    "DiagnosticoCompleto": DiagnosticoCompleto,
    "Empleados": Empleados,
    "EstadoCuentaDetalle": EstadoCuentaDetalle,
    "EstadosCuenta": EstadosCuenta,
    "Gastos": Gastos,
    "GestionTasas": GestionTasas,
    "HerramientaManual": HerramientaManual,
    "Home": Home,
    "ImprimirComanda": ImprimirComanda,
    "Ingredientes": Ingredientes,
    "InvitarNestor": InvitarNestor,
    "Platos": Platos,
    "ProcesarVenta": ProcesarVenta,
    "RecetasPrimarias": RecetasPrimarias,
    "RecetasSecundarias": RecetasSecundarias,
    "ReparadorCOP": ReparadorCOP,
    "ReporteDetalle": ReporteDetalle,
    "ReporteEntradaSalidaDetalle": ReporteEntradaSalidaDetalle,
    "ReporteMensual": ReporteMensual,
    "Reportes": Reportes,
    "ReportesDiarios": ReportesDiarios,
    "ReportesEntradaSalida": ReportesEntradaSalida,
    "ReportesMetodosPago": ReportesMetodosPago,
    "SolucionManual": SolucionManual,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};