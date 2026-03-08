import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Info, CheckCircle, XCircle } from "lucide-react";

export default function ConfirmDialog({ 
  open, 
  onConfirm, 
  onCancel, 
  title, 
  description, 
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger", // "danger", "warning", "info", "success"
  isLoading = false
}) {
  const variantConfig = {
    danger: {
      icon: Trash2,
      gradient: "from-red-600 to-rose-700",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      buttonClass: "bg-red-600 hover:bg-red-700 shadow-red-200",
      badge: "text-red-100"
    },
    warning: {
      icon: AlertTriangle,
      gradient: "from-orange-600 to-amber-700",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      buttonClass: "bg-orange-600 hover:bg-orange-700 shadow-orange-200",
      badge: "text-orange-100"
    },
    info: {
      icon: Info,
      gradient: "from-blue-600 to-indigo-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      buttonClass: "bg-blue-600 hover:bg-blue-700 shadow-blue-200",
      badge: "text-blue-100"
    },
    success: {
      icon: CheckCircle,
      gradient: "from-green-600 to-emerald-700",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      buttonClass: "bg-green-600 hover:bg-green-700 shadow-green-200",
      badge: "text-green-100"
    }
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl">
        <DialogHeader className={`bg-gradient-to-r ${config.gradient} -m-6 mb-6 p-6 rounded-t-lg`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 ${config.iconBg} rounded-xl`}>
              <Icon className={`w-7 h-7 ${config.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">{title}</DialogTitle>
              <DialogDescription className={`${config.badge} text-sm mt-1`}>
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="px-8"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-10 h-11 rounded-xl font-bold shadow-lg ${config.buttonClass}`}
          >
            {isLoading ? "Procesando..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}