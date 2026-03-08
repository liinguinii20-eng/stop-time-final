import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";

export default function InvitarNestor() {
  const [loading, setLoading] = useState(false);
  const [invitado, setInvitado] = useState(false);

  const handleInvitar = async () => {
    try {
      setLoading(true);
      
      await base44.users.inviteUser("stoptimework@gmail.com", "admin");
      
      setInvitado(true);
      toast.success("¡Invitación enviada a Nestor exitosamente!");
    } catch (error) {
      toast.error("Error al enviar la invitación: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen flex items-center justify-center">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Invitar a Nestor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Nombre:</span>
              <span className="font-medium">Nestor</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Email:</span>
              <span className="font-medium">stoptimework@gmail.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rol:</span>
              <span className="font-medium">Admin</span>
            </div>
          </div>

          {invitado ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">¡Invitación enviada!</p>
                <p className="text-xs text-green-700">Nestor recibirá un email para crear su cuenta.</p>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleInvitar}
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando invitación...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Enviar Invitación
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-gray-500 text-center">
            Esta acción enviará un correo de invitación a Nestor para que pueda acceder como administrador a la aplicación.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
