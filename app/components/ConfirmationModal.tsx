import { ReactNode } from 'react';
import { X, Check, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { LoadingMark } from '@/app/components/ui/PageLoader';
import { Modal } from '@/app/components/ui/Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'warning' | 'info';
  children?: ReactNode;
  showCancel?: boolean;
  closeOnConfirm?: boolean;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  children,
  showCancel = true,
  closeOnConfirm = true,
  isLoading = false
}: ConfirmationModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      isLoading={isLoading}
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={20} aria-hidden="true" />
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isLoading) return;
              if (onConfirm) onConfirm();
              if (closeOnConfirm) onClose();
            }}
            disabled={isLoading}
            aria-busy={isLoading}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white transition-colors disabled:cursor-wait disabled:opacity-60",
              variant === 'danger' ? "bg-red-600 hover:bg-red-500" :
              variant === 'success' ? "bg-emerald-600 hover:bg-emerald-500" :
              variant === 'warning' ? "bg-amber-600 hover:bg-amber-500" :
              "bg-blue-600 hover:bg-blue-500"
            )}
          >
            {isLoading ? <LoadingMark /> : <Check size={20} aria-hidden="true" />}
            {confirmText}
          </button>
        </div>
      )}
    >
      <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            {variant === 'danger' && <div className="rounded-lg bg-red-100 p-2.5 text-red-700"><AlertTriangle size={22} aria-hidden="true" /></div>}
            {variant === 'warning' && <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700"><AlertTriangle size={22} aria-hidden="true" /></div>}
            {variant === 'success' && <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700"><Check size={22} aria-hidden="true" /></div>}
            {variant === 'info' && <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700"><Info size={22} aria-hidden="true" /></div>}
            <span className="font-semibold text-gray-800">Confira antes de continuar</span>
          </div>
          {children}
      </div>
    </Modal>
  );
}
