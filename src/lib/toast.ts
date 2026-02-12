import { toast } from "sonner";

// Success toast
export function showSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

// Error toast
export function showError(message: string, description?: string) {
  toast.error(message, { description });
}

// Info toast
export function showInfo(message: string, description?: string) {
  toast.info(message, { description });
}

// Re-export toast for direct usage if needed
export { toast };
