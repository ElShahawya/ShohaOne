/**
 * Lightweight toast bus.
 * Any module can report success/error/info without prop-drilling, while
 * `App.tsx` owns the actual rendering through the existing ToastContainer.
 */
export type ToastKind = 'success' | 'error' | 'info';

export interface ToastDetail {
  message: string;
  type: ToastKind;
}

export function notify(message: string, type: ToastKind = 'info'): void {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(new CustomEvent<ToastDetail>('shaha_toast', { detail: { message, type } }));
}
