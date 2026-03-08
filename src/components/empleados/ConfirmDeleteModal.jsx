import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ConfirmDeleteModal({ empleado, onConfirm, onCancel, isLoading }) {
  if (!empleado) return null;

  return (
    <Dialog open={!!empleado} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px] bg-red-50 border-2 border-red-300">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl text-red-900">
              ⚠️ Confirmar Eliminación Permanente
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-700 space-y-3 pt-2">
            <p className="font-semibold text-base">
              Estás a punto de eliminar permanentemente a:
            </p>
            <div className="bg-white rounded-lg p-4 border-2 border-red-200">
              <p className="font-bold text-gray-900 text-lg">{empleado.nombre_completo}</p>
              <p className="text-sm text-gray-600">Usuario: @{empleado.usuario}</p>
              <p className="text-sm text-gray-600 capitalize">Rol: {empleado.rol}</p>
            </div>
            <div className="bg-red-100 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-red-900">⚠️ Esta acción es IRREVERSIBLE</p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>El empleado será eliminado permanentemente de la base de datos</li>
                <li>No podrá acceder más al sistema</li>
                <li>Su historial de sesiones se mantendrá pero ya no podrá iniciar sesión</li>
                <li>Esta acción NO se puede deshacer</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 italic">
              ¿Estás absolutamente seguro de que deseas continuar?
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                🗑️ ELIMINAR PERMANENTEMENTE
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}