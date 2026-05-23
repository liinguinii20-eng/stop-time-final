import React, { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Receipt, Filter, Calendar } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import ComandaForm from "../components/comandas/ComandaForm";
import ComandasList from "../components/comandas/ComandasList";
import ComandaDetalle from "../components/comandas/ComandaDetalle";
// NOTA: El descuento de inventario lo maneja el backend en POST /comandas y POST /comandas/:id/pagar

export default function Comandas() {
  const [showForm, setShowForm] = useState(false);
  const [comandaSeleccionada, setComandaSeleccionada] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("abierta");
  const [fechaFiltro, setFechaFiltro] = useState(format(new Date(), 'yyyy-MM-dd'));

  const queryClient = useQueryClient();

  const { data: comandas = [], isLoading: loadingComandas } = useQuery({
    queryKey: ['comandas'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 200),
  });

  const { data: detallesComandas = [] } = useQuery({
    queryKey: ['detalles-comandas'],
    queryFn: () => base44.entities.DetalleComanda.list('-created_date', 500),
  });

  const { data: platos = [] } = useQuery({
    queryKey: ['platos'],
    queryFn: () => base44.entities.Plato.list(),
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['personal'],
    queryFn: () => base44.entities.Empleado.list(),
  });

  // Obtener empleado en sesión
  const [empleadoSesion, setEmpleadoSesion] = React.useState(null);

  React.useEffect(() => {
    const sesion = localStorage.getItem('empleado_sesion');
    if (sesion) {
      setEmpleadoSesion(JSON.parse(sesion));
    }
  }, []);

  // Generar próximo número de comanda
  const generarNumeroComanda = () => {
    const ultimaComanda = comandas.reduce((max, c) => {
      const num = parseInt(c.numero_comanda.replace('C-', ''));
      return num > max ? num : max;
    }, 0);
    return `C-${String(ultimaComanda + 1).padStart(3, '0')}`;
  };

  // Mutation para crear comanda con detalles
  const crearComandaMutation = useMutation({
    mutationFn: async ({ comandaData, platosSeleccionados }) => {
      const numeroComanda = generarNumeroComanda();
      const total = platosSeleccionados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

      const payload = {
        numero_comanda: numeroComanda,
        mesa_numero: comandaData.mesa_numero,
        mesero_nombre: empleadoSesion?.nombre_completo || 'Mesero',
        fecha_apertura: new Date().toISOString(),
        estado: 'abierta',
        total_comanda: total,
        notas: comandaData.notas || '',
        tipo_movimiento: comandaData.tipo_movimiento || 'VENTA',
        empleado_id: comandaData.empleado_id,
        empleado_nombre: comandaData.empleado_nombre,
        motivo_merma: comandaData.motivo_merma,
        admin_password: comandaData.admin_password,
        detalles: platosSeleccionados.map(p => ({
          plato_id: p.id,
          plato_nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio
        }))
      };

      console.log('Payload a enviar:', payload);

      // Since we modified the backend custom route, we can POST to /api/comandas
      const result = await fetch('/api/comandas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!result.ok) {
        const errData = await result.json();
        throw new Error(errData.error || 'Error al crear la comanda');
      }
      return result.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      
      if (data.isSpecialMode) {
        queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
        queryClient.invalidateQueries({ queryKey: ['alertas'] });
        if (data.tipo_movimiento === 'CREDITO_EMPLEADO') {
          queryClient.invalidateQueries({ queryKey: ['cuentas-por-cobrar'] });
        }
      }
      
      setShowForm(false);
      toast.success(data.isSpecialMode ? `Operación procesada: ${data.tipo_movimiento}` : "Comanda creada exitosamente");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Mutation para agregar platos a comanda existente
  const agregarPlatosMutation = useMutation({
    mutationFn: async ({ comandaId, platosNuevos, totalActual }) => {
      // Usar endpoint dedicado que notifica a la cocina en tiempo real
      const result = await fetch(`/api/comandas/${comandaId}/detalles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({
          platos: platosNuevos.map(p => ({
            plato_id: p.id,
            plato_nombre: p.nombre,
            cantidad: p.cantidad,
            precio_unitario: p.precio,
            notas_plato: p.notas || '',
            variante: p.variante || null
          }))
        })
      });
      if (!result.ok) throw new Error('Error agregando platos');

      // Actualizar el total de la comanda
      let nuevoTotal = totalActual;
      for (const plato of platosNuevos) {
        nuevoTotal += plato.precio * plato.cantidad;
      }
      await base44.entities.Comanda.update(comandaId, {
        total_comanda: nuevoTotal
      });

      return nuevoTotal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      toast.success("Platos agregados a la comanda");
    }
  });

  // Mutation para actualizar estado de plato
  const actualizarEstadoPlatoMutation = useMutation({
    mutationFn: ({ detalleId, nuevoEstado }) => 
      base44.entities.DetalleComanda.update(detalleId, { estado_plato: nuevoEstado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      toast.success("Estado actualizado");
    }
  });

  // Mutation para cerrar comanda y procesar pago
  const cerrarComandaMutation = useMutation({
    mutationFn: async ({ comandaId, metodoPago, tasaBs, pagosMixtos, datosCuenta, descuentoMonto = 0 }) => {
      const comanda = comandas.find(c => c.id === comandaId);
      
      // Obtener tasas desde localStorage o valores por defecto
      const tasaCOPActual = parseFloat(localStorage.getItem('tasa_cop_actual') || '4000');
      const tasaUSDFinal = parseFloat(localStorage.getItem('tasa_usd_final')) || tasaBs;

      const subtotalUSD = comanda.total_comanda;
      const totalUSD = subtotalUSD - descuentoMonto;
      const totalCOP = totalUSD * tasaCOPActual;
      const totalVES = totalUSD * tasaUSDFinal;

      // Llamar al endpoint unificado del servidor
      const result = await base44.custom.pagarComanda(comandaId, {
        metodoPago,
        tasaBs: tasaUSDFinal,
        pagosMixtos,
        descuentoMonto,
        totalUSD,
        totalVES,
        totalCOP
      });

      return { 
        ...result,
        total: totalUSD,
        descuento: descuentoMonto
      };
    },
    onSuccess: (data) => {
      console.log("🎉 Proceso completado exitosamente");
      
      // Invalidar TODAS las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-ventas'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['cuentas-por-cobrar'] });
      
      setComandaSeleccionada(null);
      
      const mensajeDescuento = data.descuento > 0 ? ` | Descuento: -$${data.descuento.toFixed(2)}` : '';
      toast.success(
        `✅ Pago procesado: $${data.total.toFixed(2)}${mensajeDescuento} | ${data.ingredientesActualizados} ingredientes actualizados${data.alertasCreadas > 0 ? ` | ${data.alertasCreadas} alertas generadas` : ''}`
      );
    },
    onError: (error) => {
      console.error("❌ Error en proceso de pago:", error);
      toast.error(`❌ Error al procesar el pago: ${error.message}`);
    }
  });

  // Mutation para eliminar comanda (solo administrador)
  const eliminarComandaMutation = useMutation({
    mutationFn: async (comandaId) => {
      // Eliminar detalles primero
      const detalles = detallesComandas.filter(d => d.comanda_id === comandaId);
      for (const detalle of detalles) {
        await base44.entities.DetalleComanda.delete(detalle.id);
      }
      // Eliminar comanda
      await base44.entities.Comanda.delete(comandaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      setComandaSeleccionada(null);
      toast.success("Comanda eliminada exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar la comanda");
    }
  });

  const handleCrearComanda = (data) => {
    crearComandaMutation.mutate(data);
  };

  const handleEliminarComanda = (comandaId) => {
    eliminarComandaMutation.mutate(comandaId);
  };

  const handleAgregarPlatos = (comandaId, platosNuevos) => {
    const comanda = comandas.find(c => c.id === comandaId);
    agregarPlatosMutation.mutate({
      comandaId,
      platosNuevos,
      totalActual: comanda.total_comanda
    });
  };

  const handleVerDetalle = (comanda) => {
    setComandaSeleccionada(comanda);
  };

  const handleCerrarDetalle = () => {
    setComandaSeleccionada(null);
  };

  // Obtener tasa de cambio actual
  const { data: tasas = [] } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 5),
  });

  const comandasFiltradas = comandas.filter(comanda => {
    const matchesEstado = estadoFiltro === "todas" || comanda.estado === estadoFiltro;
    const matchesSearch = 
      comanda.numero_comanda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comanda.mesa_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comanda.mesero_nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por fecha
    let matchesFecha = true;
    if (fechaFiltro) {
      try {
        const fechaComanda = parseISO(comanda.fecha_apertura);
        const inicioFiltro = startOfDay(parseISO(fechaFiltro + 'T00:00:00'));
        const finFiltro = endOfDay(parseISO(fechaFiltro + 'T23:59:59'));
        matchesFecha = fechaComanda >= inicioFiltro && fechaComanda <= finFiltro;
      } catch {
        matchesFecha = true;
      }
    }
    
    return matchesEstado && matchesSearch && matchesFecha;
  });

  const comandasAbiertas = comandas.filter(c => c.estado === 'abierta').length;
  const comandasCerradas = comandas.filter(c => c.estado === 'cerrada').length;
  const comandasPagadas = comandas.filter(c => c.estado === 'pagada').length;

  const platosActivos = platos.filter(p => p.activo);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50/50 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Elegante */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-200">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              Control de Comandas
            </h1>
            <p className="text-slate-500 font-medium ml-1">Administración, facturación y seguimiento en tiempo real</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-14 px-6 text-base font-bold shadow-lg shadow-amber-200/50 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nueva Comanda
          </Button>
        </div>

        {/* Stats Modernos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white hover:shadow-2xl hover:shadow-green-200/40 transition-all duration-500 relative group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
              <Receipt className="w-24 h-24 text-green-600" />
            </div>
            <CardContent className="p-8 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Comandas Abiertas</p>
                <h3 className="text-4xl font-black text-green-600 tracking-tight">{comandasAbiertas}</h3>
              </div>
              <div className="p-4 rounded-2xl bg-green-50 text-green-600">
                <Receipt className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white hover:shadow-2xl hover:shadow-blue-200/40 transition-all duration-500 relative group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
              <Receipt className="w-24 h-24 text-blue-600" />
            </div>
            <CardContent className="p-8 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Comandas Pagadas</p>
                <h3 className="text-4xl font-black text-blue-600 tracking-tight">{comandasPagadas}</h3>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
                <Receipt className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y Filtros Elegantes */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Búsqueda rápida</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Buscar por número, mesa o mesero..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha de Comanda</label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={fechaFiltro}
                    onChange={(e) => setFechaFiltro(e.target.value)}
                    className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado</label>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <select
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border-none rounded-2xl text-sm font-semibold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="abierta">Comandas Abiertas</option>
                    <option value="pagada">Comandas Pagadas</option>
                    <option value="todas">Todas las Comandas</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <ComandaForm
            platos={platosActivos}
            empleados={empleados.filter(e => e.activo)}
            onSubmit={handleCrearComanda}
            onCancel={() => setShowForm(false)}
            isLoading={crearComandaMutation.isPending}
          />
        )}

        {/* Detalle de Comanda */}
        {comandaSeleccionada && (
          <ComandaDetalle
            comanda={comandaSeleccionada}
            detalles={detallesComandas.filter(d => d.comanda_id === comandaSeleccionada.id)}
            platos={platosActivos}
            onAgregarPlatos={handleAgregarPlatos}
            onActualizarEstado={actualizarEstadoPlatoMutation.mutate}
            onCerrarComanda={cerrarComandaMutation.mutate}
            onEliminarComanda={handleEliminarComanda}
            onCerrar={handleCerrarDetalle}
            isLoading={agregarPlatosMutation.isPending || cerrarComandaMutation.isPending || eliminarComandaMutation.isPending}
            empleado={empleadoSesion}
          />
        )}

        {/* Lista de Comandas */}
        <ComandasList
          comandas={comandasFiltradas}
          detalles={detallesComandas}
          onVerDetalle={handleVerDetalle}
          isLoading={loadingComandas}
        />
      </div>
    </div>
  );
}