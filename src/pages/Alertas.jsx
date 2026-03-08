import { useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Package, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Alertas() {
  const queryClient = useQueryClient();

  const { data: alertas = [], isLoading: loadingAlertas } = useQuery({
    queryKey: ['alertas'],
    queryFn: () => base44.entities.AlertaStock.list('-created_date', 1000),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(null, 1000),
  });

  const resolverAlertaMutation = useMutation({
    mutationFn: (alertaId) => base44.entities.AlertaStock.update(alertaId, { resuelta: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success("Alerta marcada como resuelta");
    },
  });

  const verificarStockMutation = useMutation({
    mutationFn: async () => {
      const alertasCreadas = [];
      
      for (const ingrediente of ingredientes) {
        if (ingrediente.cantidad_disponible <= ingrediente.cantidad_minima) {
          const alertasExistentes = await base44.entities.AlertaStock.filter({
            ingrediente_id: ingrediente.id,
            resuelta: false
          });
          
          if (alertasExistentes.length === 0) {
            await base44.entities.AlertaStock.create({
              ingrediente_id: ingrediente.id,
              nombre_ingrediente: ingrediente.nombre,
              cantidad_actual: ingrediente.cantidad_disponible,
              cantidad_minima: ingrediente.cantidad_minima,
              fecha_alerta: new Date().toISOString(),
              resuelta: false
            });
            alertasCreadas.push(ingrediente.nombre);
          }
        }
      }
      
      return alertasCreadas;
    },
    onSuccess: (alertasCreadas) => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      if (alertasCreadas.length > 0) {
        toast.success(`Se crearon ${alertasCreadas.length} nuevas alertas`);
      }
    },
  });

  useEffect(() => {
    if (ingredientes.length > 0) {
      verificarStockMutation.mutate();
    }
  }, [ingredientes.length]);

  const alertasPendientes = alertas.filter(a => !a.resuelta);
  const alertasResueltas = alertas.filter(a => a.resuelta);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
              <span className="leading-tight">Alertas de Stock</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Monitorea ingredientes con stock bajo</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link to={createPageUrl("Ingredientes")} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Package className="w-4 h-4 mr-2" />
                Ver Inventario
              </Button>
            </Link>
            <Button
              onClick={() => verificarStockMutation.mutate()}
              disabled={verificarStockMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${verificarStockMutation.isPending ? 'animate-spin' : ''}`} />
              Verificar Stock
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">Alertas Pendientes</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-red-600">{alertasPendientes.length}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-red-100 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">Alertas Resueltas</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-600">{alertasResueltas.length}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-green-100 flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Alertas</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{alertas.length}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-gray-100 flex-shrink-0">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas Pendientes */}
        <Card className="shadow-lg border-none">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <span>Alertas Pendientes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {loadingAlertas ? (
              <Skeleton className="h-64 w-full" />
            ) : alertasPendientes.length > 0 ? (
              <div className="space-y-3">
                {/* Vista móvil - Cards */}
                <div className="block md:hidden space-y-3">
                  {alertasPendientes.map((alerta) => (
                    <div key={alerta.id} className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{alerta.nombre_ingrediente}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {format(new Date(alerta.fecha_alerta), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Badge variant="destructive" className="flex items-center gap-1 ml-2">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="text-xs">Pendiente</span>
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Stock Actual</p>
                          <p className="font-semibold text-red-600">{alerta.cantidad_actual}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Stock Mínimo</p>
                          <p className="font-semibold text-gray-900">{alerta.cantidad_minima}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => resolverAlertaMutation.mutate(alerta.id)}
                        disabled={resolverAlertaMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolver
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Vista desktop - Tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-50">
                        <TableHead>Ingrediente</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Stock Mínimo</TableHead>
                        <TableHead>Fecha Alerta</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertasPendientes.map((alerta) => (
                        <TableRow key={alerta.id} className="bg-red-50/50">
                          <TableCell className="font-medium">{alerta.nombre_ingrediente}</TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {alerta.cantidad_actual}
                          </TableCell>
                          <TableCell>{alerta.cantidad_minima}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(alerta.fecha_alerta), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Pendiente
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => resolverAlertaMutation.mutate(alerta.id)}
                              disabled={resolverAlertaMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Resolver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">¡Excelente! No hay alertas pendientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas Resueltas */}
        {alertasResueltas.length > 0 && (
          <Card className="shadow-lg border-none">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <span>Alertas Resueltas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Stock Mínimo</TableHead>
                      <TableHead>Fecha Alerta</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasResueltas.slice(0, 10).map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell className="font-medium">{alerta.nombre_ingrediente}</TableCell>
                        <TableCell>{alerta.cantidad_actual}</TableCell>
                        <TableCell>{alerta.cantidad_minima}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(alerta.fecha_alerta), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            Resuelta
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 