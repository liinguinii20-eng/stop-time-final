import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Database, 
  ShieldAlert,
  Server,
  ChevronDown,
  ChevronUp,
  List
} from "lucide-react";
import CierreTrimestral from '../components/CierreTrimestral';

// API helper
const API_URL = '/api';

// Función para obtener el header de autorización con JWT
const getAuthHeader = () => {
  try {
    const token = localStorage.getItem('jwt_token');
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`
    };
  } catch {
    return {};
  }
};

async function fetchDetailedStats() {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: {
      ...getAuthHeader()
    }
  });
  if (!res.ok) throw new Error('Error fetching stats');
  return res.json();
}



// Componente para mostrar lista de registros
const DataList = ({ title, data, idField = 'id', nameField = 'nombre' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = data?.data || [];
  const count = items.length;
  
  if (count === 0) return null;
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <List className="w-4 h-4" />
          <span className="font-medium">{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="text-xs p-2 bg-white border rounded font-mono">
              <span className="text-gray-500">#{idx + 1}</span>{" "}
              <span className="text-blue-600">{item[idField]?.substring(0, 8)}</span>
              {item[nameField] && <span className="text-green-600"> - {item[nameField]}</span>}
              {item.nombre_completo && <span className="text-green-600"> - {item.nombre_completo}</span>}
              {item.usuario && <span className="text-green-600"> - {item.usuario}</span>}
              {item.total_venta !== undefined && <span className="text-orange-600"> - ${item.total_venta}</span>}
              {item.monto !== undefined && <span className="text-orange-600"> - ${item.monto}</span>}
              {item.total_comanda !== undefined && <span className="text-orange-600"> - ${item.total_comanda}</span>}
              {item.fecha && <span className="text-gray-500"> - {new Date(item.fecha).toLocaleDateString()}</span>}
              {item.fecha_hora && <span className="text-gray-500"> - {new Date(item.fecha_hora).toLocaleDateString()}</span>}
              {item.createdAt && <span className="text-gray-500"> - {new Date(item.createdAt).toLocaleDateString()}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminReset() {

  // Fetch detailed stats from server
  const { data: stats, isLoading, error } = useQuery({ 
    queryKey: ['admin-stats'], 
    queryFn: fetchDetailedStats,
    refetchInterval: 5000 
  });



  // Default stats if loading or error
  const defaultStats = {
    ventas: { count: 0, data: [], error: null },
    comandas: { count: 0, data: [], error: null },
    gastos: { count: 0, data: [], error: null },
    cuentasPorCobrar: { count: 0, data: [], error: null },
    empleados: { count: 0, data: [], error: null },
    platos: { count: 0, data: [], error: null },
    ingredientes: { count: 0, data: [], error: null },
    compras: { count: 0, data: [], error: null },
    adelantos: { count: 0, data: [], error: null },
    alertas: { count: 0, data: [], error: null },
    usuarios: { count: 0, data: [], error: null }
  };

  const displayStats = stats || defaultStats;

  // Calcular totales
  const totalToDelete = 
    (displayStats.ventas?.count || 0) +
    (displayStats.comandas?.count || 0) +
    (displayStats.gastos?.count || 0) +
    (displayStats.cuentasPorCobrar?.count || 0) +
    (displayStats.compras?.count || 0) +
    (displayStats.adelantos?.count || 0);

  const totalSafe = 
    (displayStats.empleados?.count || 0) +
    (displayStats.platos?.count || 0) +
    (displayStats.ingredientes?.count || 0);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administración - Reset del Sistema</h1>
              <p className="text-gray-500">Ver datos antes de eliminar</p>
            </div>
          </div>
          <div>
            <CierreTrimestral />
          </div>
        </div>

        {/* Error de carga */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error cargando datos</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Advertencia */}
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>ADVERTENCIA CRÍTICA</AlertTitle>
          <AlertDescription>
            Esta acción eliminará <strong>TODOS</strong> los datos listados abajo.
            Los datos de configuración se mantendrán.
            <br/>
            <strong>Esta acción no se puede deshacer.</strong>
          </AlertDescription>
        </Alert>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">Datos a eliminar: {totalToDelete}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">Datos seguros: {totalSafe}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DATOS A ELIMINAR - Con detalles */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Database className="w-5 h-5" />
              Datos que serán eliminados
            </CardTitle>
            <CardDescription className="text-red-600">
              Haz clic en cada sección para ver los registros individuales
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Cargando datos...</div>
            ) : (
              <>
                <DataList title="Ventas" data={displayStats.ventas} nameField="metodo_pago" />
                <DataList title="Comandas" data={displayStats.comandas} nameField="numero_comanda" />
                <DataList title="Gastos" data={displayStats.gastos} nameField="descripcion" />
                <DataList title="Cuentas por Cobrar" data={displayStats.cuentasPorCobrar} nameField="clienteNombre" />
                <DataList title="Compras" data={displayStats.compras} nameField="proveedor" />
                <DataList title="Adelantos" data={displayStats.adelantos} nameField="descripcion" />
                <DataList title="Usuarios del sistema" data={displayStats.usuarios} nameField="nombre" />
              </>
            )}
          </CardContent>
        </Card>

        {/* DATOS SEGUROS */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Server className="w-5 h-5" />
              Datos que se mantendrán
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Cargando datos...</div>
            ) : (
              <>
                <DataList title="Empleados" data={displayStats.empleados} nameField="nombre" />
                <DataList title="Platos" data={displayStats.platos} nameField="nombre" />
                <DataList title="Ingredientes" data={displayStats.ingredientes} nameField="nombre" />
              </>
            )}
          </CardContent>
        </Card>



      </div>
    </div>
  );
}
