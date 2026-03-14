"use client";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600 text-white"
      : "bg-[#6366F1] hover:bg-[#5558E6] text-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#111114] shadow-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-[#A1A1AA] mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-white border border-[rgba(255,255,255,0.10)] rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
