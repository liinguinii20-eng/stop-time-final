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
import { descontarStock } from "../components/utils/descontarStock";

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

      const comanda = await base44.entities.Comanda.create({
        numero_comanda: numeroComanda,
        mesa_numero: comandaData.mesa_numero,
        mesero_nombre: empleadoSesion?.nombre_completo || 'Mesero',
        fecha_apertura: new Date().toISOString(),
        estado: 'abierta',
        total_comanda: total,
        notas: comandaData.notas || ''
      });

      for (const plato of platosSeleccionados) {
        await base44.entities.DetalleComanda.create({
          comanda_id: comanda.id,
          plato_id: plato.id,
          plato_nombre: plato.nombre,
          cantidad: plato.cantidad,
          precio_unitario: plato.precio,
          subtotal: plato.precio * plato.cantidad,
          estado_plato: 'pendiente',
          notas_plato: plato.notas || '',
          variante: plato.variante || null
        });
      }

      return comanda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      setShowForm(false);
      toast.success("Comanda creada exitosamente");
    },
    onError: () => {
      toast.error("Error al crear la comanda");
    }
  });

  // Mutation para agregar platos a comanda existente
  const agregarPlatosMutation = useMutation({
    mutationFn: async ({ comandaId, platosNuevos, totalActual }) => {
      let nuevoTotal = totalActual;

      for (const plato of platosNuevos) {
        await base44.entities.DetalleComanda.create({
          comanda_id: comandaId,
          plato_id: plato.id,
          plato_nombre: plato.nombre,
          cantidad: plato.cantidad,
          precio_unitario: plato.precio,
          subtotal: plato.precio * plato.cantidad,
          estado_plato: 'pendiente',
          notas_plato: plato.notas || '',
          variante: plato.variante || null
        });
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
    mutationFn: async ({ comandaId, metodoPago, tasaBs, pagosMixtos, datosCuenta, descuentoPorcentaje = 0, descuentoMonto = 0 }) => {
      console.log("🔄 Iniciando proceso de pago...");

      const comanda = comandas.find(c => c.id === comandaId);
      const detalles = detallesComandas.filter(d => d.comanda_id === comandaId);

      // Obtener tasas desde localStorage
      const tasaCOPActual = parseFloat(localStorage.getItem('tasa_cop_actual') || '4000');
      const tasaUSDFinal = parseFloat(localStorage.getItem('tasa_usd_final')) || tasaBs;

      // Aplicar descuento al total
      const subtotalUSD = comanda.total_comanda;
      const totalUSD = subtotalUSD - descuentoMonto;
      const totalCOP = totalUSD * tasaCOPActual; // Usar tasa COP configurable
      const totalVES = totalUSD * tasaUSDFinal; // Usar tasa USD configurable con +16%
      const totalVESConIVA = totalVES * 1.16;

      if (descuentoPorcentaje > 0) {
        console.log(`🎁 Descuento aplicado: ${descuentoPorcentaje}% (-$${descuentoMonto.toFixed(2)})`);
        console.log(`💰 Total original: $${subtotalUSD.toFixed(2)} → Total con descuento: $${totalUSD.toFixed(2)}`);
      }

      if (!comanda) {
        throw new Error("Comanda no encontrada");
      }

      if (detalles.length === 0) {
        throw new Error("La comanda no tiene platos");
      }

      console.log("✅ Comanda encontrada:", comanda.numero_comanda);
      console.log("✅ Detalles:", detalles.length, "platos");

      // 1. Crear venta PRIMERO (con monto real cobrado)
      console.log("💰 Creando venta...");
      
      // Detectar si el método de pago es en bolívares
      const esMetodoBolivares = metodoPago && metodoPago.endsWith('_bs');
      const montoOriginal = esMetodoBolivares ? totalVES : totalUSD;
      
      const venta = await base44.entities.Venta.create({
        fecha_hora: new Date().toISOString(),
        total_venta: totalUSD, // Siempre en USD para cálculos
        metodo_pago: metodoPago,
        costo_total: 0,
        ganancia: 0,
        total_cop: totalCOP,
        total_ves: totalVES,
        tasa_bs_aplicada: tasaBs,
        monto_original: montoOriginal, // Monto en la moneda original del pago
        moneda_original: esMetodoBolivares ? 'VES' : 'USD'
      });
      console.log("✅ Venta creada con ID:", venta.id, "| Monto: $", totalUSD.toFixed(2), esMetodoBolivares ? `(Bs ${totalVES.toFixed(2)})` : '');

      // 1.5. Si es cuenta por cobrar, crear registro (con monto real)
      if (metodoPago === "cuentas_por_cobrar" && datosCuenta) {
        console.log("📋 Creando cuenta por cobrar...");
        await base44.entities.CuentaPorCobrar.create({
          cliente_nombre: datosCuenta.cliente_nombre,
          cliente_telefono: datosCuenta.cliente_telefono || "",
          monto_total: totalUSD, // Total con descuento aplicado
          monto_pendiente: totalUSD, // Total con descuento aplicado
          comanda_id: comanda.id,
          comanda_numero: comanda.numero_comanda,
          fecha_creacion: new Date().toISOString(),
          fecha_vencimiento: datosCuenta.fecha_vencimiento || null,
          estado: "pendiente",
          notas: datosCuenta.notas || "",
          venta_id: venta.id
        });
        console.log("✅ Cuenta por cobrar creada con monto:", totalUSD.toFixed(2));
      }

      // 1.6. Si es pago mixto, crear detalles
      if (metodoPago === "mixto" && pagosMixtos) {
        console.log("💳 Registrando pagos mixtos...");
        for (const pago of pagosMixtos) {
          await base44.entities.PagoMixto.create({
            venta_id: venta.id,
            ...pago
          });
        }
        console.log("✅ Pagos mixtos registrados");
      }

      // 2. Crear detalles de venta
      console.log("📋 Creando detalles de venta...");
      for (const detalle of detalles) {
        await base44.entities.DetalleVenta.create({
          venta_id: venta.id,
          plato_id: detalle.plato_id,
          plato_nombre: detalle.plato_nombre,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          subtotal: detalle.subtotal,
          costo_unitario: 0,
          variante: detalle.variante || null
        });
      }
      console.log("✅ Detalles de venta creados");

      // 3. 🔥 ACTUALIZAR INVENTARIO CON EXPLOSIÓN DE MATERIALES
      console.log("📦 Actualizando inventario con EXPLOSIÓN DE MATERIALES...");
      console.log("═══════════════════════════════════════════════════");
      
      let ingredientesAfectados = 0;

      for (const detalle of detalles) {
        console.log(`\n🍽️  PLATO: ${detalle.plato_nombre} x ${detalle.cantidad}`);
        console.log("─────────────────────────────────────────────────");
        
        try {
          const resultado = await descontarStock(detalle.plato_id, detalle.cantidad);
          ingredientesAfectados += resultado.ingredientesAfectados;
          console.log(`✅ Explosión completada: ${resultado.ingredientesAfectados} ingredientes base afectados`);
        } catch (error) {
          console.error(`❌ Error en explosión de ${detalle.plato_nombre}:`, error);
          throw new Error(`Error descontando stock de ${detalle.plato_nombre}: ${error.message}`);
        }
      }

      console.log("\n═══════════════════════════════════════════════════");
      console.log(`✅ INVENTARIO ACTUALIZADO: ${ingredientesAfectados} ingredientes base procesados`);
      console.log("═══════════════════════════════════════════════════\n");

      // 4. Cerrar comanda AL FINAL con conversiones
      console.log("🔒 Cerrando comanda...");
      await base44.entities.Comanda.update(comandaId, {
        estado: 'pagada',
        fecha_cierre: new Date().toISOString(),
        total_cop: totalCOP,
        total_ves: totalVES,
        total_ves_con_iva: totalVESConIVA,
        tasa_bs_aplicada: tasaBs
      });
      console.log("✅ Comanda cerrada");

      return { 
        venta, 
        ingredientesActualizados: ingredientesAfectados, 
        alertasCreadas: 0,
        total: totalUSD, // Total con descuento aplicado
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
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
              <span className="leading-tight">Comandas</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Gestiona las comandas del restaurante
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Comanda
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Abiertas</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-600">{comandasAbiertas}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-green-100 flex-shrink-0">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Pagadas</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-blue-600">{comandasPagadas}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-blue-100 flex-shrink-0">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  placeholder="Buscar por número, mesa o mesero..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  type="date"
                  value={fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                  className="flex-1 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm sm:text-base"
                >
                  <option value="abierta">Comandas Abiertas</option>
                  <option value="pagada">Comandas Pagadas</option>
                  <option value="todas">Todas las Comandas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <ComandaForm
            platos={platosActivos}
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