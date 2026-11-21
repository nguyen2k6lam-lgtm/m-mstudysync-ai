import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message?: string;
  itemTitle?: string;
  warningNote?: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemTitle,
  warningNote,
  confirmText,
  cancelText,
}) => {
  const { language } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveTitle =
    title || (language === 'vi' ? 'Xác nhận xóa dữ liệu' : 'Confirm Deletion');
  const effectiveMessage =
    message ||
    (language === 'vi'
      ? 'Bạn có chắc chắn muốn xóa nội dung này không? Hành động này không thể hoàn tác.'
      : 'Are you sure you want to delete this item? This action cannot be undone.');
  const effectiveConfirmText =
    confirmText || (language === 'vi' ? 'Xóa' : 'Delete');
  const effectiveCancelText =
    cancelText || (language === 'vi' ? 'Hủy' : 'Cancel');

  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-left shadow-2xl transition-all sm:my-8 w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Danger Icon */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {effectiveTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {effectiveMessage}
              </p>
            </div>
          </div>

          {/* Item Preview if provided */}
          {itemTitle && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">
                {language === 'vi' ? 'Mục được chọn' : 'Selected item'}
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {itemTitle}
              </p>
            </div>
          )}

          {/* Cascade Warning Note if provided */}
          {warningNote && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
              <span className="text-amber-500 font-bold shrink-0 mt-0.5">⚠️</span>
              <span>{warningNote}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {effectiveCancelText}
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleExecute}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'vi' ? 'Đang xóa...' : 'Deleting...'}</span>
                </>
              ) : (
                <span>{effectiveConfirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
