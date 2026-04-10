"use client";

import { useEffect, useId, useRef } from "react";

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
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Escape key closes the dialog. Registered globally so the backdrop and
  // both buttons (even while focused) all respond to Escape the same way.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  // Initial focus lands on Cancel so a stray Enter press doesn't accidentally
  // confirm a destructive action. Users must explicitly Tab to Confirm.
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  const confirmClass =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600 text-white"
      : "bg-[#6366F1] hover:bg-[#5558E6] text-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#111114] shadow-2xl p-6">
        <h3 id={titleId} className="text-base font-semibold text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-[#A1A1AA] mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-white border border-[rgba(255,255,255,0.10)] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
