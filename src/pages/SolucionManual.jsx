import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SolucionManual() {
  const { data: ventas = [], refetch: refetchVentas } = useQuery({
    queryKey: ['ventas-cop'],
    queryFn: async () => {
      const todas = await base44.entities.Venta.list('-created_date', 1000);
      return todas.filter(v => v.metodo_pago === 'efectivo_cop' || v.metodo_pago === 'nequi_cop');
    }
  });

  const copiar = (texto) => {
    navigator.clipboard.writeText(texto);
    toast.success("Copiado al portapapeles");
  };

  const copiarScript = (venta) => {
    const saldo = venta.total_cop || (venta.total_venta * 4000);
    const script = `{
  "metodo_pago": "${venta.metodo_pago}",
  "fecha_movimiento": "${venta.fecha_hora}",
  "tipo": "ENTRADA",
  "concepto": "Venta #${venta.comanda_id || 'N/A'}",
  "monto": ${saldo},
  "monto_usd": ${venta.total_venta},
  "referencia_id": "V-${venta.id}",
  "referencia_tipo": "VENTA",
  "comanda_id": "${venta.comanda_id || ''}",
  "saldo_actual": ${saldo}
}`;
    copiar(script);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl('EstadosCuenta')}>
            <Button variant="outline" size="sm" className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            🏗️ Solución Manual Definitiva
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ver ventas COP y crear movimientos manualmente
          </p>
        </div>

        {/* INSTRUCCIONES */}
        <Card className="border-2 border-red-500 shadow-lg">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              INSTRUCCIONES - Crear Movimientos Manualmente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-white rounded-lg p-4 border">
              <p className="font-bold text-gray-900 mb-3">📋 PASOS PARA SOLUCIONAR:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Revisa la lista de <strong>Ventas COP sin movimientos</strong> abajo</li>
                <li>Para cada venta, haz clic en <strong>"Copiar JSON"</strong></li>
                <li>Ve al <strong>Backoffice</strong> (Dashboard → Manage Data)</li>
                <li>Busca la tabla <strong>"estado_cuenta_metodos"</strong></li>
                <li>Haz clic en <strong>"+ Add record"</strong></li>
                <li>Pega el JSON copiado en el formulario</li>
                <li>Haz clic en <strong>"Save"</strong></li>
                <li>Repite para cada venta faltante</li>
                <li>Vuelve a <strong>"Estado de Cuenta"</strong> y recarga</li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-900">
              <p className="font-semibold mb-1">💡 NOTA IMPORTANTE:</p>
              <p>El campo <code>saldo_actual</code> debe ser la suma acumulada. Si es la primera entrada, usa el mismo valor que <code>monto</code>. Si hay movimientos anteriores, suma al saldo anterior.</p>
            </div>
          </CardContent>
        </Card>

        {/* CONTADOR */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">
            📊 Total Ventas COP: <span className="text-blue-600">{ventas.length}</span>
          </div>
          <Button onClick={() => refetchVentas()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* LISTA DE VENTAS */}
        {ventas.length > 0 ? (
          <div className="space-y-3">
            {ventas.map((venta) => {
              const montoCOP = venta.total_cop || (venta.total_venta * 4000);
              
              return (
                <Card key={venta.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {venta.metodo_pago === 'efectivo_cop' ? '💵' : '📱'}
                          </span>
                          <h3 className="font-bold text-gray-900">
                            {venta.metodo_pago === 'efectivo_cop' ? 'Efectivo COP' : 'Nequi'}
                          </h3>
                          <span className="text-xs text-gray-500">
                            Venta ID: {venta.id.substring(0, 8)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Fecha</p>
                            <p className="font-semibold">
                              {new Date(venta.fecha_hora).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Comanda</p>
                            <p className="font-semibold">#{venta.comanda_id || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Monto USD</p>
                            <p className="font-semibold text-green-600">
                              ${venta.total_venta.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Monto COP</p>
                            <p className="font-semibold text-blue-600">
                              ₡{montoCOP.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 bg-gray-50 rounded p-2 text-xs font-mono text-gray-700 max-h-32 overflow-auto">
                          <pre>{JSON.stringify({
                            metodo_pago: venta.metodo_pago,
                            fecha_movimiento: venta.fecha_hora,
                            tipo: "ENTRADA",
                            concepto: `Venta #${venta.comanda_id || 'N/A'}`,
                            monto: montoCOP,
                            monto_usd: venta.total_venta,
                            referencia_id: `V-${venta.id}`,
                            referencia_tipo: "VENTA",
                            comanda_id: venta.comanda_id || "",
                            saldo_actual: montoCOP
                          }, null, 2)}</pre>
                        </div>
                      </div>

                      <Button
                        onClick={() => copiarScript(venta)}
                        className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                        size="sm"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 text-lg">
                ✅ No hay ventas en COP o ya están todas registradas
              </p>
            </CardContent>
          </Card>
        )}

        {/* AYUDA ADICIONAL */}
        <Card className="border-2 border-amber-500">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-amber-900">🆘 ¿Necesitas ayuda?</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-2 text-sm text-gray-700">
            <p><strong>Si el backoffice no tiene la tabla "estado_cuenta_metodos":</strong></p>
            <p>Esta tabla puede no estar expuesta para edición manual. En ese caso:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Contacta al administrador del sistema</li>
              <li>Solicita que habiliten la tabla en el backoffice</li>
              <li>O solicita que ejecuten un script de backend para crear los movimientos</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

