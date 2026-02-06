import { toast } from "sonner";

// Success toast
export function showSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

// Error toast
export function showError(message: string, description?: string) {
  toast.error(message, { description });
}

// Warning toast
export function showWarning(message: string, description?: string) {
  toast.warning(message, { description });
}

// Info toast
export function showInfo(message: string, description?: string) {
  toast.info(message, { description });
}

// Loading toast with promise
export function showLoading<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  }
) {
  return toast.promise(promise, messages);
}

// Dismiss all toasts
export function dismissAll() {
  toast.dismiss();
}

// Re-export toast for direct usage if needed
export { toast };
