import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Package, AlertTriangle, TrendingUp, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import ModalComprarIngrediente from "../components/ingredientes/ModalComprarIngrediente";

export default function ComprasIngredientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ingredienteParaCompra, setIngredienteParaCompra] = useState(null);
  const [empleadoActual, setEmpleadoActual] = useState(null);
  const [filtroStock, setFiltroStock] = useState("todos");

  const queryClient = useQueryClient();

  useEffect(() => {
    const empleadoSesion = localStorage.getItem('empleado_sesion');
    if (empleadoSesion) {
      setEmpleadoActual(JSON.parse(empleadoSesion));
    }
  }, []);

  const { data: ingredientes = [], isLoading: loadingIngredientes } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  const { data: compras = [], isLoading: loadingCompras } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-created_date', 100),
  });

  const registrarCompraMutation = useMutation({
    mutationFn: async ({ ingrediente, datosCompra }) => {
      const costoTotal = datosCompra.cantidad * datosCompra.costo_unitario;

      // 1. Registrar compra
      const compra = await base44.entities.Compra.create({
        ingrediente_id: ingrediente.id,
        ingrediente_nombre: ingrediente.nombre,
        cantidad: datosCompra.cantidad,
        unidad_medida: ingrediente.unidad_medida,
        costo_unitario: datosCompra.costo_unitario,
        costo_total: costoTotal,
        proveedor: datosCompra.proveedor || ingrediente.proveedor,
        numero_factura: datosCompra.numero_factura || "",
        fecha_compra: new Date().toISOString(),
        fecha_entrega_estimada: datosCompra.fecha_entrega_estimada || null,
        tipo_compra: "reposicion",
        estado: "recibida",
        empleado_nombre: empleadoActual?.nombre_completo || "Sistema",
        notas: datosCompra.notas || ""
      });

      // 1.5. Registrar gasto automáticamente
      await base44.entities.Gasto.create({
        fecha_gasto: new Date().toISOString(),
        descripcion: `Compra de ${ingrediente.nombre} - ${datosCompra.cantidad} ${ingrediente.unidad_medida}`,
        categoria: "Compras Ingredientes",
        monto: costoTotal,
        metodo_pago: datosCompra.metodo_pago || "Efectivo",
        comprobante: datosCompra.numero_factura || `Compra #${compra.id}`,
        recurrente: false,
        compra_id: compra.id,
        tipo_gasto: "compra_ingredientes"
      });

      // 2. Actualizar solo stock del ingrediente (el costo se maneja manualmente)
      const nuevoStock = ingrediente.cantidad_disponible + datosCompra.cantidad;
      await base44.entities.Ingrediente.update(ingrediente.id, {
        cantidad_disponible: nuevoStock,
        proveedor: datosCompra.proveedor || ingrediente.proveedor
      });

      // 4. Resolver alertas de stock si corresponde
      if (nuevoStock > ingrediente.cantidad_minima) {
        const alertas = await base44.entities.AlertaStock.filter({
          ingrediente_id: ingrediente.id,
          resuelta: false
        });

        for (const alerta of alertas) {
          await base44.entities.AlertaStock.update(alerta.id, {
            resuelta: true
          });
        }
      }

      return {
        compra,
        ingrediente: ingrediente.nombre,
        stockAnterior: ingrediente.cantidad_disponible,
        stockNuevo: nuevoStock,
        costoTotal
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['historial-costos'] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });

      setIngredienteParaCompra(null);

      toast.success(
        `✅ Compra y gasto registrados: ${data.ingrediente} | Stock: ${data.stockAnterior} → ${data.stockNuevo}`
      );
    },
    onError: (error) => {
      toast.error("Error al registrar la compra");
      console.error(error);
    }
  });

  const recalcularCostosPorIngrediente = async (ingredienteId) => {
    try {
      const recetas = await base44.entities.Receta.filter({ ingrediente_id: ingredienteId });
      const ingrediente = await base44.entities.Ingrediente.filter({ id: ingredienteId });

      if (ingrediente.length === 0) return;

      const platosAfectados = new Set();

      for (const receta of recetas) {
        const costoIngrediente = receta.cantidad_requerida * ingrediente[0].costo_por_unidad;
        await base44.entities.Receta.update(receta.id, {
          costo_ingrediente: costoIngrediente
        });
        platosAfectados.add(receta.plato_id);
      }

      for (const platoId of platosAfectados) {
        const recetasPlato = await base44.entities.Receta.filter({ plato_id: platoId });
        const costoTotal = recetasPlato.reduce((sum, r) => sum + (r.costo_ingrediente || 0), 0);
        const precioSugerido = costoTotal * 1.7;

        await base44.entities.Plato.update(platoId, {
          costo_total: costoTotal,
          precio_sugerido: precioSugerido
        });
      }
    } catch (error) {
      console.error("Error recalculando costos:", error);
    }
  };

  const handleComprar = (ingrediente) => {
    setIngredienteParaCompra(ingrediente);
  };

  const handleConfirmarCompra = (datosCompra) => {
    registrarCompraMutation.mutate({
      ingrediente: ingredienteParaCompra,
      datosCompra
    });
  };

  const ingredientesFiltrados = ingredientes.filter(ing => {
    const matchSearch = ing.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const bajoStock = ing.cantidad_disponible <= ing.cantidad_minima;

    if (filtroStock === "bajo_stock") return matchSearch && bajoStock;
    if (filtroStock === "todos") return matchSearch;
    return matchSearch;
  });

  const ingredientesBajoStock = ingredientes.filter(
    ing => ing.cantidad_disponible <= ing.cantidad_minima
  );

  const comprasRecientes = compras.slice(0, 10);
  
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  
  const totalComprasHoy = compras.filter(c => {
    const fechaCompra = new Date(c.fecha_compra);
    return fechaCompra >= inicioHoy && fechaCompra <= finHoy;
  }).reduce((sum, c) => sum + c.costo_total, 0);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <span className="leading-tight">Compras de Ingredientes</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Registra compras y actualiza inventario automáticamente
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Necesitan Reposición</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-red-600">{ingredientesBajoStock.length}</h3>
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
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Compras Hoy</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-600">${totalComprasHoy.toFixed(2)}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-green-100 flex-shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Compras</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-blue-600">{compras.length}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-blue-100 flex-shrink-0">
                  <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ingredientes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="historial">Historial de Compras</TabsTrigger>
          </TabsList>

          {/* Tab: Ingredientes */}
          <TabsContent value="ingredientes" className="space-y-4">
            {/* Search y Filtro */}
            <Card className="shadow-lg border-none">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Buscar ingredientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={filtroStock}
                    onChange={(e) => setFiltroStock(e.target.value)}
                    className="px-4 py-2 border rounded-md bg-white"
                  >
                    <option value="todos">Todos los Ingredientes</option>
                    <option value="bajo_stock">Solo Bajo Stock</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Ingredientes */}
            <Card className="shadow-lg border-none">
              {loadingIngredientes ? (
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              ) : ingredientesFiltrados.length === 0 ? (
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No se encontraron ingredientes</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Ingrediente</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Stock Mínimo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Costo/Unidad</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientesFiltrados.map((ingrediente) => {
                        const bajoStock = ingrediente.cantidad_disponible <= ingrediente.cantidad_minima;
                        return (
                          <TableRow key={ingrediente.id} className={bajoStock ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{ingrediente.nombre}</TableCell>
                            <TableCell>
                              <span className={bajoStock ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                {ingrediente.cantidad_disponible} {ingrediente.unidad_medida}
                              </span>
                            </TableCell>
                            <TableCell>{ingrediente.cantidad_minima} {ingrediente.unidad_medida}</TableCell>
                            <TableCell>
                              {bajoStock ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  Bajo Stock
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>${ingrediente.costo_por_unidad.toFixed(2)}</TableCell>
                            <TableCell className="text-gray-600">{ingrediente.proveedor || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleComprar(ingrediente)}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Comprar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: Historial */}
          <TabsContent value="historial" className="space-y-4">
            <Card className="shadow-lg border-none">
              {loadingCompras ? (
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              ) : comprasRecientes.length === 0 ? (
                <CardContent className="p-12 text-center">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay compras registradas</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Costo Unit.</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Empleado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprasRecientes.map((compra) => (
                        <TableRow key={compra.id}>
                          <TableCell>
                            {format(new Date(compra.fecha_compra), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">{compra.ingrediente_nombre}</TableCell>
                          <TableCell>
                            {compra.cantidad} {compra.unidad_medida}
                          </TableCell>
                          <TableCell>${compra.costo_unitario.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ${compra.costo_total.toFixed(2)}
                          </TableCell>
                          <TableCell>{compra.proveedor || "-"}</TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {compra.empleado_nombre || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Compra */}
        <ModalComprarIngrediente
          ingrediente={ingredienteParaCompra}
          onConfirm={handleConfirmarCompra}
          onCancel={() => setIngredienteParaCompra(null)}
          isLoading={registrarCompraMutation.isPending}
        />
      </div>
    </div>
  );
} 