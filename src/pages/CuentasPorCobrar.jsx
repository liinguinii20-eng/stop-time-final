import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  Search, 
  DollarSign, 
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function CuentasPorCobrar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente");
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo_usd");
  const [notasPago, setNotasPago] = useState("");

  const queryClient = useQueryClient();
  const empleadoSesion = JSON.parse(localStorage.getItem('empleado_sesion') || 'null');

  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ['cuentas-por-cobrar'],
    queryFn: () => base44.entities.CuentaPorCobrar.list('-created_date', 200),
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos-cuentas'],
    queryFn: () => base44.entities.PagoCuentaPorCobrar.list('-created_date', 200),
  });

  const { data: tasas = [] } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 5),
  });

  const tasaActual = tasas.length > 0 ? tasas[0] : null;

  const registrarPagoMutation = useMutation({
    mutationFn: async ({ cuentaId, monto, metodo, notas }) => {
      const cuenta = cuentas.find(c => c.id === cuentaId);
      if (!cuenta) throw new Error("Cuenta no encontrada");

      const pagoData = {
        cuenta_id: cuentaId,
        monto_pagado: parseFloat(monto),
        metodo_pago: metodo,
        fecha_pago: new Date().toISOString(),
        tasa_bs_aplicada: tasaActual?.tasa_bs_usd || 0,
        notas: notas || "",
        empleado_nombre: empleadoSesion?.nombre_completo || "Sistema"
      };

      await base44.entities.PagoCuentaPorCobrar.create(pagoData);

      const nuevoMontoPendiente = cuenta.monto_pendiente - parseFloat(monto);
      const nuevoEstado = nuevoMontoPendiente <= 0 ? "pagada" : 
                          nuevoMontoPendiente < cuenta.monto_total ? "pagada_parcial" : "pendiente";

      await base44.entities.CuentaPorCobrar.update(cuentaId, {
        monto_pendiente: Math.max(0, nuevoMontoPendiente),
        estado: nuevoEstado
      });

      return { cuenta: cuenta.cliente_nombre, monto: parseFloat(monto) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-por-cobrar'] });
      queryClient.invalidateQueries({ queryKey: ['pagos-cuentas'] });
      setMostrarModalPago(false);
      setCuentaSeleccionada(null);
      setMontoPago("");
      setNotasPago("");
      toast.success(`✅ Pago registrado: ${data.cuenta} - $${data.monto.toFixed(2)}`);
    },
    onError: () => {
      toast.error("Error al registrar el pago");
    }
  });

  const handleRegistrarPago = () => {
    if (!montoPago || parseFloat(montoPago) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (parseFloat(montoPago) > cuentaSeleccionada.monto_pendiente) {
      toast.error("El monto no puede ser mayor al pendiente");
      return;
    }

    registrarPagoMutation.mutate({
      cuentaId: cuentaSeleccionada.id,
      monto: montoPago,
      metodo: metodoPago,
      notas: notasPago
    });
  };

  const cuentasFiltradas = cuentas.filter(cuenta => {
    const matchesEstado = estadoFiltro === "todas" || cuenta.estado === estadoFiltro;
    const nombre = cuenta.cliente_nombre || cuenta.clienteNombre || "";
    const matchesSearch = 
      nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cuenta.comanda_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cuenta.cliente_telefono?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesEstado && matchesSearch;
  });

  const totalPendiente = cuentas
    .filter(c => c.estado !== "pagada")
    .reduce((sum, c) => sum + c.monto_pendiente, 0);

  const totalPagadas = cuentas
    .filter(c => c.estado === "pagada")
    .reduce((sum, c) => sum + c.monto_total, 0);

  const cuentasPendientes = cuentas.filter(c => c.estado === "pendiente").length;
  const cuentasPagadasCount = cuentas.filter(c => c.estado === "pagada").length;

  const estadoConfig = {
    pendiente: { 
      icon: Clock, 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      label: "Pendiente" 
    },
    pagada_parcial: { 
      icon: AlertTriangle, 
      color: "bg-orange-100 text-orange-800 border-orange-200", 
      label: "Pago Parcial" 
    },
    pagada: { 
      icon: CheckCircle, 
      color: "bg-green-100 text-green-800 border-green-200", 
      label: "Pagada" 
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
            <span className="leading-tight">Cuentas por Cobrar</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Gestiona créditos y pagos pendientes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Pendiente</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-red-600">
                    ${totalPendiente.toFixed(2)}
                  </h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-red-100 flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Cuentas Pendientes</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-yellow-600">{cuentasPendientes}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-yellow-100 flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Cobrado</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-green-600">
                    ${totalPagadas.toFixed(2)}
                  </h3>
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
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Cuentas Pagadas</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-600">{cuentasPagadasCount}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-blue-100 flex-shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, teléfono o comanda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm sm:text-base"
                />
              </div>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm sm:text-base"
              >
                <option value="pendiente">Pendientes</option>
                <option value="pagada_parcial">Pagos Parciales</option>
                <option value="pagada">Pagadas</option>
                <option value="todas">Todas</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Cuentas */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <p className="text-center text-gray-500">Cargando...</p>
            ) : cuentasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay cuentas por cobrar</p>
              </div>
            ) : (
              <>
                {/* Vista móvil */}
                <div className="block lg:hidden space-y-4">
                  {cuentasFiltradas.map((cuenta) => {
                    const config = estadoConfig[cuenta.estado];
                    const Icon = config.icon;
                    const pagosCuenta = pagos.filter(p => p.cuenta_id === cuenta.id);

                    return (
                      <div key={cuenta.id} className="bg-white border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-base">{cuenta.cliente_nombre}</h3>
                            {cuenta.cliente_telefono && (
                              <p className="text-xs text-gray-500">{cuenta.cliente_telefono}</p>
                            )}
                            {cuenta.comanda_numero && (
                              <p className="text-xs text-gray-500">Comanda: {cuenta.comanda_numero}</p>
                            )}
                          </div>
                          <Badge className={`${config.color} border flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Monto Total</p>
                            <p className="font-bold text-gray-900">${cuenta.monto_total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Pendiente</p>
                            <p className="font-bold text-red-600">${cuenta.monto_pendiente.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          <p>Creada: {format(parseISO(cuenta.fecha_creacion), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                          {cuenta.fecha_vencimiento && (
                            <p>Vence: {format(parseISO(cuenta.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}</p>
                          )}
                        </div>

                        {cuenta.estado !== "pagada" && (
                          <Button
                            onClick={() => {
                              setCuentaSeleccionada(cuenta);
                              setMontoPago(cuenta.monto_pendiente.toFixed(2));
                              setMostrarModalPago(true);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Registrar Pago
                          </Button>
                        )}

                        {pagosCuenta.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Pagos registrados:</p>
                            <div className="space-y-1">
                              {pagosCuenta.map((pago) => (
                                <div key={pago.id} className="text-xs text-gray-500">
                                  <div className="flex justify-between">
                                    <span>{format(parseISO(pago.fecha_pago), "dd/MM/yyyy", { locale: es })}</span>
                                    <span className="font-semibold">${pago.monto_pagado.toFixed(2)}</span>
                                  </div>
                                  {pago.empleado_nombre && (
                                    <div className="text-gray-400 mt-0.5">Por: {pago.empleado_nombre}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Vista desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Cliente</TableHead>
                        <TableHead>Comanda</TableHead>
                        <TableHead>Monto Total</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentasFiltradas.map((cuenta) => {
                        const config = estadoConfig[cuenta.estado];
                        const Icon = config.icon;

                        return (
                          <TableRow key={cuenta.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{cuenta.cliente_nombre}</p>
                                {cuenta.cliente_telefono && (
                                  <p className="text-xs text-gray-500">{cuenta.cliente_telefono}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-blue-600">
                              {cuenta.comanda_numero || "-"}
                            </TableCell>
                            <TableCell className="font-bold text-gray-900">
                              ${cuenta.monto_total.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-bold text-red-600">
                              ${cuenta.monto_pendiente.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {format(parseISO(cuenta.fecha_creacion), "dd/MM/yyyy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {cuenta.fecha_vencimiento 
                                ? format(parseISO(cuenta.fecha_vencimiento), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${config.color} border flex items-center gap-1 w-fit`}>
                                <Icon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {cuenta.estado !== "pagada" && (
                                <Button
                                  onClick={() => {
                                    setCuentaSeleccionada(cuenta);
                                    setMontoPago(cuenta.monto_pendiente.toFixed(2));
                                    setMostrarModalPago(true);
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Pagar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal Registrar Pago */}
        <Dialog open={mostrarModalPago} onOpenChange={setMostrarModalPago}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
            </DialogHeader>

            {cuentaSeleccionada && (
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-bold text-gray-900">{cuentaSeleccionada.cliente_nombre}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Monto Total</p>
                      <p className="font-bold">${cuentaSeleccionada.monto_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pendiente</p>
                      <p className="font-bold text-red-600">${cuentaSeleccionada.monto_pendiente.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monto a Pagar ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={cuentaSeleccionada.monto_pendiente}
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo_usd">💵 Efectivo USD</SelectItem>
                      <SelectItem value="binance_usd">📱 Binance</SelectItem>
                      <SelectItem value="zinli_usd">📱 Zinli</SelectItem>
                      <SelectItem value="paypal_usd">🌐 PayPal</SelectItem>
                      <SelectItem value="zelle_usd">🏦 Zelle</SelectItem>
                      <SelectItem value="efectivo_cop">💵 Efectivo COP</SelectItem>
                      <SelectItem value="nequi_cop">📱 Nequi</SelectItem>
                      <SelectItem value="tarjeta_bs">💳 Tarjeta Bs</SelectItem>
                      <SelectItem value="pago_movil_bs">📱 Pago Móvil</SelectItem>
                      <SelectItem value="mixto">🔄 Pago Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={notasPago}
                    onChange={(e) => setNotasPago(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMostrarModalPago(false)}
                disabled={registrarPagoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRegistrarPago}
                className="bg-green-600 hover:bg-green-700"
                disabled={registrarPagoMutation.isPending}
              >
                {registrarPagoMutation.isPending ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
