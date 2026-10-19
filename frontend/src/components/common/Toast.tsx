import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const styles: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />,
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-900 dark:text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />,
    },
  };

  const { bg, border, text, icon } = styles[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${bg} ${border} ${text} ${className}`}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 text-sm">
        {title && <h3 className="font-semibold text-base mb-1">{title}</h3>}
        <div>{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 -mr-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Toast;
