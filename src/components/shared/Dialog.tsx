import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap & Return focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
          const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Focus first element or dialog container
      setTimeout(() => {
        if (dialogRef.current) {
          const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 z-10 animate-in zoom-in-95 duration-150 focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            )}
          </div>
          {showCloseButton && (
            <IconButton
              aria-label="Close dialog"
              icon={<X className="w-4 h-4" />}
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0 -mr-1 -mt-1"
            />
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
};
