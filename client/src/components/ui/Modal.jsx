import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 8, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`w-full ${widths[size]} max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-pop`}
          >
            {title && (
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-5 py-3.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger }) {
  return (
    <Modal open={open} onClose={onClose} title={null} size="sm">
      <div className="flex gap-4">
        <div className={`mt-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${danger ? 'bg-red-100 dark:bg-red-900/40' : 'bg-primary-50 dark:bg-primary-900/30'}`}>
          <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-primary-700'} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              data-testid="confirm-btn"
              onClick={() => {
                onConfirm?.();
                onClose?.();
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-primary-800 hover:bg-primary-700'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
