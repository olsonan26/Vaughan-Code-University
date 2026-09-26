import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { AlertTriangle, DollarSign, Layers } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
  /** PRD Cost Control: List items that will be regenerated or affected */
  scopeItems?: string[];
  /** PRD Cost Control: Estimated USD cost if available */
  estimatedCostUsd?: number;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  scopeItems,
  estimatedCostUsd,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        {description && (
          <p className="text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        )}

        {/* PRD Scope & Cost Control warning panel */}
        {((scopeItems && scopeItems.length > 0) || estimatedCostUsd !== undefined) && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 space-y-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Operation Scope & Resource Warning</span>
            </div>

            {scopeItems && scopeItems.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-amber-950">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  <span>The following artifacts will be regenerated:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-1">
                  {scopeItems.map((item, idx) => (
                    <li key={idx} className="truncate">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {estimatedCostUsd !== undefined && (
              <div className="flex items-center gap-1.5 font-medium text-amber-950 pt-1 border-t border-amber-200/60">
                <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  Estimated AI credit cost: ~${estimatedCostUsd.toFixed(3)} USD
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
