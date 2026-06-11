'use client';

import { useEffect, type HTMLAttributes } from 'react';

export type ToastVariant = 'info' | 'error' | 'success';

const variantClasses: Record<ToastVariant, string> = {
  info: 'border-coral',
  error: 'border-error',
  success: 'border-success',
};

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  message: string;
  variant?: ToastVariant;
  /** Called after `duration` ms so the parent can unmount the toast. */
  onDismiss?: () => void;
  /** Auto-dismiss delay in ms (default 3000). */
  duration?: number;
}

/** Bottom-right toast with auto-dismiss after `duration` (default 3s). */
export function Toast({
  message,
  variant = 'info',
  onDismiss,
  duration = 3000,
  className = '',
  ...props
}: ToastProps) {
  useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 rounded-md border bg-gray-100 px-4 py-3 font-body text-sm text-white shadow-hard ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {message}
    </div>
  );
}
