import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  const titleId = title ? 'modal-title' : undefined;
  const descId = description ? 'modal-description' : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${sizeClasses[size]} bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-2 px-4 sm:px-6 py-4 border-b border-border">
          <div className="min-w-0 flex flex-col break-words">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 min-w-0 p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-border bg-muted/40 flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
