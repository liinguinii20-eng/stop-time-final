import { useState, useEffect, useRef, useCallback } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, CheckCircle, Utensils, User, Wifi, WifiOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// ─── Sistema de Audio Persistente (compatible con Chrome) ────────────
// Chrome BLOQUEA audio hasta que el usuario toque la pantalla.
// Solución: UN solo AudioContext global que se desbloquea con click/touch.
let _audioCtx = null;
let _audioDesbloqueado = false;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Desbloquear audio con gesto del usuario
function desbloquearAudio() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      _audioDesbloqueado = true;
      console.log('[Cocina] ✅ Audio desbloqueado exitosamente');
      // Reproducir un sonido silencioso para confirmar desbloqueo
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, ctx.currentTime);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    });
  } else {
    _audioDesbloqueado = true;
  }
}

// Registrar listeners globales para desbloquear al primer toque
if (typeof window !== 'undefined') {
  const eventos = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    desbloquearAudio();
    eventos.forEach(e => window.removeEventListener(e, handler));
  };
  eventos.forEach(e => window.addEventListener(e, handler, { once: false }));
}

// Sonido de alerta: Grillo nocturno bonito y melódico 🦗✨
const playLoudAlert = () => {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
      console.warn('[Cocina] AudioContext suspendido — toca la pantalla para activar sonido');
      return;
    }

    const now = ctx.currentTime;

    // Master con volumen alto pero limpio
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);
    masterGain.connect(ctx.destination);

    // Un solo "cri" de grillo: tono puro + armónico suave con tremolo natural
    const criPulse = (startTime, baseFreq, duration) => {
      const t = now + startTime;

      // Tono fundamental — sine puro = sonido limpio y bonito
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, t);
      // Leve glissando ascendente como grillo real
      osc1.frequency.linearRampToValueAtTime(baseFreq * 1.03, t + duration);

      // Armónico suave a la octava (da cuerpo sin ser estridente)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2, t);
      osc2.frequency.linearRampToValueAtTime(baseFreq * 2.06, t + duration);

      // Tremolo rápido (30-40 Hz) — da la textura de "cri-cri" vibrante
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(35, t);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.4, t); // profundidad del tremolo

      lfo.connect(lfoGain);

      // Envolvente suave: fade-in rápido, sustain, fade-out natural
      const env1 = ctx.createGain();
      env1.gain.setValueAtTime(0, t);
      env1.gain.linearRampToValueAtTime(0.7, t + 0.008);
      env1.gain.setValueAtTime(0.7, t + duration * 0.7);
      env1.gain.exponentialRampToValueAtTime(0.001, t + duration);

      const env2 = ctx.createGain();
      env2.gain.setValueAtTime(0, t);
      env2.gain.linearRampToValueAtTime(0.2, t + 0.008);
      env2.gain.setValueAtTime(0.2, t + duration * 0.7);
      env2.gain.exponentialRampToValueAtTime(0.001, t + duration);

      // Conectar tremolo a las envolventes
      lfoGain.connect(env1.gain);
      lfoGain.connect(env2.gain);

      osc1.connect(env1);
      env1.connect(masterGain);

      osc2.connect(env2);
      env2.connect(masterGain);

      osc1.start(t);
      osc1.stop(t + duration);
      osc2.start(t);
      osc2.stop(t + duration);
      lfo.start(t);
      lfo.stop(t + duration);
    };

    // Un chirp = ráfaga rápida de "cris" (como un grillo real frotando sus alas)
    const chirpGroup = (groupStart, numPulses, baseFreq) => {
      const pulseSpacing = 0.055; // espacio entre cada "cri"
      const pulseDuration = 0.04; // duración de cada pulso
      for (let i = 0; i < numPulses; i++) {
        // Pequeña variación natural en frecuencia
        const freqVar = baseFreq + (Math.random() - 0.5) * 40;
        criPulse(groupStart + i * pulseSpacing, freqVar, pulseDuration);
      }
    };

    // Patrón natural de grillo: 3 ráfagas con pausa entre ellas
    // Frecuencia ~4500 Hz = tono agudo pero dulce (grillo de campo)
    const freq = 4200;

    chirpGroup(0.0,  6, freq);     // cri-cri-cri-cri-cri-cri
    chirpGroup(0.7,  5, freq);     // cri-cri-cri-cri-cri
    chirpGroup(1.3,  6, freq);     // cri-cri-cri-cri-cri-cri

    // Segunda ronda un poco más baja (variación natural)
    chirpGroup(2.2,  5, freq - 80);  // cri-cri-cri-cri-cri
    chirpGroup(2.9,  6, freq - 80);  // cri-cri-cri-cri-cri-cri

    // Fade out del master después de todas las notas
    masterGain.gain.setValueAtTime(0.85, now + 3.5);
    masterGain.gain.linearRampToValueAtTime(0, now + 4.0);

  } catch (e) {
    console.error('[Cocina] Error reproduciendo alerta grillo:', e);
  }
};

// ─── Componente: Contador de tiempo real ────────────────────────────
const TiempoEspera = ({ fechaApertura }) => {
  const [minutos, setMinutos] = useState(0);

  useEffect(() => {
    const calcular = () => {
      const diff = Math.floor((new Date() - new Date(fechaApertura)) / 60000);
      setMinutos(diff);
    };
    calcular();
    const interval = setInterval(calcular, 60000);
    return () => clearInterval(interval);
  }, [fechaApertura]);

  const getColor = () => {
    if (minutos > 20) return "text-red-500 animate-pulse";
    if (minutos > 10) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className={`flex items-center gap-1.5 font-bold ${getColor()}`}>
      <Clock className="w-4 h-4" />
      <span className="tabular-nums">{minutos} min</span>
    </div>
  );
};

// ─── Hook: Conexión SSE en tiempo real ──────────────────────────────
function useCocinaSSE(onEvent) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    // Limpiar conexión previa
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    // EventSource no soporta headers → pasamos token como query param
    const es = new EventSource(`/api/cocina/stream?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      console.log('[Cocina SSE] ✅ Conectado');
    };

    es.addEventListener('cocina', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch (err) {
        console.error('[Cocina SSE] Error parseando evento:', err);
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconectar después de 3s
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
  }, [onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return connected;
}

// ─── Componente Principal: Cocina ───────────────────────────────────
export default function Cocina() {
  const queryClient = useQueryClient();
  const [comandasAgrupadas, setComandasAgrupadas] = useState([]);
  const [comandasListasAgrupadas, setComandasListasAgrupadas] = useState([]);
  const [activeTab, setActiveTab] = useState("pendientes");
  const [sonidoActivo, setSonidoActivo] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [flashId, setFlashId] = useState(null); // Para animación de nueva comanda
  const [audioListo, setAudioListo] = useState(_audioDesbloqueado);

  // Detectar cuando el audio se desbloquea
  useEffect(() => {
    const checkAudio = () => {
      if (_audioDesbloqueado && !audioListo) setAudioListo(true);
    };
    const handler = () => { desbloquearAudio(); setTimeout(checkAudio, 200); };
    window.addEventListener('click', handler);
    window.addEventListener('touchstart', handler);
    const interval = setInterval(checkAudio, 1000);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      clearInterval(interval);
    };
  }, [audioListo]);

  // 1. Obtener comandas activas (se refresca vía SSE + fallback polling rápido)
  const { data: comandas = [] } = useQuery({
    queryKey: ['comandas-cocina'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 200),
    refetchInterval: 3000, // Actualización rápida cada 3 segundos
  });

  // 2. Obtener detalles de platos pendientes
  const { data: detalles = [] } = useQuery({
    queryKey: ['detalles-comandas-cocina'],
    queryFn: () => base44.entities.DetalleComanda.list('-created_date', 500),
    refetchInterval: 3000,
  });

  // 3. Agrupar platos por comanda
  useEffect(() => {
    const pendientes = detalles.filter(d => 
      d.estado_plato === 'pendiente' || d.estado_plato === 'en_preparacion'
    );

    const agrupadas = pendientes.reduce((acc, detalle) => {
      const comanda = comandas.find(c => c.id === detalle.comanda_id);
      if (!comanda) return acc;

      if (!acc[detalle.comanda_id]) {
        acc[detalle.comanda_id] = {
          ...comanda,
          platos: []
        };
      }
      acc[detalle.comanda_id].platos.push(detalle);
      return acc;
    }, {});

    const comandasArray = Object.values(agrupadas).sort((a, b) => 
      new Date(a.fecha_apertura) - new Date(b.fecha_apertura)
    );

    setComandasAgrupadas(comandasArray);

    const listas = detalles.filter(d => d.estado_plato === 'listo');
    const agrupadasListas = listas.reduce((acc, detalle) => {
      const comanda = comandas.find(c => c.id === detalle.comanda_id);
      if (!comanda) return acc;

      if (!acc[detalle.comanda_id]) {
        acc[detalle.comanda_id] = {
          ...comanda,
          platos: []
        };
      }
      acc[detalle.comanda_id].platos.push(detalle);
      return acc;
    }, {});

    const comandasListasArray = Object.values(agrupadasListas).sort((a, b) => 
      new Date(b.fecha_apertura) - new Date(a.fecha_apertura)
    );

    setComandasListasAgrupadas(comandasListasArray);

  }, [detalles, comandas]);

  // 4. Reproducir sonido de alerta FUERTE
  const playAlertSound = useCallback(() => {
    if (!sonidoActivo) return;
    playLoudAlert();
  }, [sonidoActivo]);

  // 5. Handler de eventos SSE
  const handleSSEEvent = useCallback((event) => {
    console.log('[Cocina] Evento SSE recibido:', event.tipo);
    setUltimaActualizacion(new Date());

    switch (event.tipo) {
      case 'nueva_comanda': {
        // Refrescar datos inmediatamente
        queryClient.invalidateQueries({ queryKey: ['comandas-cocina'] });
        queryClient.invalidateQueries({ queryKey: ['detalles-comandas-cocina'] });
        
        // Alerta visual y sonora
        playAlertSound();
        setFlashId(event.payload?.id);
        setTimeout(() => setFlashId(null), 4000);
        
        toast("🔔 ¡NUEVA COMANDA!", {
          description: `Mesa ${event.payload?.mesa_numero || '?'} — ${event.payload?.mesero_nombre || 'Mesero'}`,
          position: "top-center",
          duration: 6000,
          style: { background: '#f97316', color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }
        });
        break;
      }

      case 'plato_agregado': {
        queryClient.invalidateQueries({ queryKey: ['comandas-cocina'] });
        queryClient.invalidateQueries({ queryKey: ['detalles-comandas-cocina'] });
        
        playAlertSound();
        toast("🍽️ Platos agregados", {
          description: `Se agregaron platos a una comanda`,
          position: "top-center",
          duration: 4000,
        });
        break;
      }

      case 'comanda_actualizada': {
        queryClient.invalidateQueries({ queryKey: ['comandas-cocina'] });
        queryClient.invalidateQueries({ queryKey: ['detalles-comandas-cocina'] });
        break;
      }

      case 'comanda_pagada': {
        queryClient.invalidateQueries({ queryKey: ['comandas-cocina'] });
        queryClient.invalidateQueries({ queryKey: ['detalles-comandas-cocina'] });
        toast.success("✅ Comanda pagada y retirada", { position: "top-center" });
        break;
      }
    }
  }, [queryClient, playAlertSound]);

  // 6. Conexión SSE
  const sseConnected = useCocinaSSE(handleSSEEvent);

  // 7. Despachar comanda completa
  const handleDespachar = async (platos) => {
    try {
      const promesas = platos.map(plato => 
        base44.entities.DetalleComanda.update(plato.id, { estado_plato: 'listo' })
      );
      await Promise.all(promesas);
      toast.success("✅ Comanda completa despachada");
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas-cocina'] });
      setActiveTab("listas");
    } catch {
      toast.error("Error al despachar comanda");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ⚠️ Banner: Activar Audio (Chrome lo requiere) */}
        {!audioListo && (
          <button
            onClick={() => { desbloquearAudio(); setTimeout(() => setAudioListo(true), 300); }}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-lg py-4 px-6 rounded-2xl flex items-center justify-center gap-3 animate-pulse shadow-lg shadow-amber-500/30 transition-all"
          >
            <Volume2 className="w-7 h-7" />
            🔊 TOCA AQUÍ PARA ACTIVAR EL SONIDO DE ALERTAS
          </button>
        )}
        
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ChefHat className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter">SISTEMA KDS</h1>
                <p className="text-orange-100 text-xs font-bold uppercase tracking-widest">Control de Producción — Tiempo Real</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Indicador de conexión */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-500 ${
                sseConnected 
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' 
                  : 'bg-red-500/20 border-red-400/40 text-red-300 animate-pulse'
              }`}>
                {sseConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {sseConnected ? 'EN VIVO' : 'RECONECTANDO...'}
                </span>
              </div>

              {/* Toggle sonido */}
              <button
                onClick={() => setSonidoActivo(!sonidoActivo)}
                className={`p-2.5 rounded-xl border transition-all ${
                  sonidoActivo 
                    ? 'bg-white/20 border-white/30 text-white' 
                    : 'bg-black/20 border-white/10 text-white/40'
                }`}
                title={sonidoActivo ? 'Silenciar alertas' : 'Activar alertas'}
              >
                {sonidoActivo ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Contador de comandas */}
              <div className="bg-black/20 px-6 py-2 rounded-2xl border border-white/10 text-center">
                <p className="text-orange-200 text-[10px] font-bold">PENDIENTES</p>
                <p className="text-3xl font-black text-white">{comandasAgrupadas.length}</p>
              </div>
            </div>
          </div>

          {/* Barra de última actualización */}
          {ultimaActualizacion && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-orange-200/60 text-[10px] font-medium">
              <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              Última actualización: {ultimaActualizacion.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Contenedor de Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex max-w-sm mx-auto">
            <TabsTrigger value="pendientes" className="flex-1 rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:font-black text-slate-400">
              En Preparación ({comandasAgrupadas.length})
            </TabsTrigger>
            <TabsTrigger value="listas" className="flex-1 rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:font-black text-slate-400">
              Listas ({comandasListasAgrupadas.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB PENDIENTES */}
          <TabsContent value="pendientes" className="mt-6">
            {comandasAgrupadas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comandasAgrupadas.map((comanda) => (
                  <Card 
                    key={comanda.id} 
                    className={`bg-white border-none shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5 transition-all duration-700 ${
                      flashId === comanda.id 
                        ? 'ring-4 ring-orange-400 scale-[1.02] shadow-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.3)]' 
                        : ''
                    }`}
                  >
                    
                    {/* Flash de nueva comanda */}
                    {flashId === comanda.id && (
                      <div className="bg-gradient-to-r from-orange-500 to-amber-400 text-white text-center py-1.5 text-xs font-black uppercase tracking-widest animate-pulse">
                        🔔 ¡NUEVA! — RECIÉN LLEGADA
                      </div>
                    )}

                    {/* Cabecera de Tarjeta */}
                    <div className="bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-orange-500 text-white px-3 py-1 rounded-lg font-black text-xl">
                            #{comanda.numero_comanda}
                          </div>
                          <div className="text-white">
                            <p className="text-[10px] text-slate-400 font-bold leading-none">MESA</p>
                            <p className="text-lg font-black leading-none">{comanda.mesa_numero}</p>
                          </div>
                        </div>
                        <TiempoEspera fechaApertura={comanda.fecha_apertura} />
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <User className="w-3 h-3" />
                        <span className="truncate uppercase font-medium">{comanda.mesero_nombre}</span>
                      </div>
                    </div>

                    {/* Lista de Platos */}
                    <CardContent className="p-0 flex-1 bg-slate-50">
                      <div className="divide-y divide-slate-200">
                        {comanda.platos.map((plato) => (
                          <div key={plato.id} className="p-4 flex gap-4 items-start">
                            <div className="bg-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0">
                              {plato.cantidad}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-slate-900 leading-tight">{plato.plato_nombre}</h3>
                              {plato.variante && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                                  {plato.variante}
                                </span>
                              )}
                              {plato.notas_plato && (
                                <div className="mt-2 bg-amber-100/50 p-2 rounded border-l-2 border-amber-400">
                                  <p className="text-xs text-amber-800 font-medium italic">"{plato.notas_plato}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    {/* Botón de Acción Finalizado */}
                    <div className="p-4 bg-white mt-auto">
                      <Button
                        onClick={() => handleDespachar(comanda.platos)}
                        className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-[0_4px_0_rgb(22,101,52)] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center justify-center gap-0"
                      >
                        <span className="text-[10px] font-black opacity-80 uppercase tracking-tighter">Completar Pedido</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-xl font-black italic">¡TODO LISTO!</span>
                        </div>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <Utensils className="w-10 h-10 text-slate-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-400 uppercase italic">Cocina en Silencio</h2>
                  <p className="text-slate-600 text-sm">Los nuevos pedidos de los meseros aparecerán aquí automáticamente en tiempo real.</p>
                  
                  {/* Indicador de estado SSE */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${
                    sseConnected 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {sseConnected ? 'Escuchando pedidos en vivo' : 'Reconectando...'}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB LISTAS */}
          <TabsContent value="listas" className="mt-6">
            {comandasListasAgrupadas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comandasListasAgrupadas.map((comanda) => (
                  <Card key={comanda.id} className="bg-white border-none shadow-xl flex flex-col overflow-hidden ring-1 ring-black/5 opacity-80 hover:opacity-100 transition-opacity">
                    {/* Cabecera de Tarjeta */}
                    <div className="bg-slate-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-600 text-white px-3 py-1 rounded-lg font-black text-xl">
                            #{comanda.numero_comanda}
                          </div>
                          <div className="text-white">
                            <p className="text-[10px] text-slate-400 font-bold leading-none">MESA</p>
                            <p className="text-lg font-black leading-none">{comanda.mesa_numero}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-2">
                        <User className="w-3 h-3" />
                        <span className="truncate uppercase font-medium">{comanda.mesero_nombre}</span>
                      </div>
                    </div>

                    {/* Lista de Platos */}
                    <CardContent className="p-0 flex-1 bg-slate-50">
                      <div className="divide-y divide-slate-200">
                        {comanda.platos.map((plato) => (
                          <div key={plato.id} className="p-4 flex gap-4 items-center">
                            <div className="bg-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0">
                              {plato.cantidad}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-slate-900 leading-tight line-through opacity-70">{plato.plato_nombre}</h3>
                              {plato.variante && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase mt-1 inline-block">
                                  {plato.variante}
                                </span>
                              )}
                            </div>
                            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-slate-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-400 uppercase italic">Sin comandas listas</h2>
                  <p className="text-slate-600 text-sm">Las comandas que despaches aparecerán en esta lista.</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}