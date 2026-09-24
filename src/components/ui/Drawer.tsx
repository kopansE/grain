import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/lib/hooks';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  width?: number;
  className?: string;
}

/** Right-side panel on desktop, bottom sheet on phones. */
export function Drawer({ open, onClose, children, title, width = 520, className }: DrawerProps) {
  const desktop = useIsDesktop();
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', on);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            className={cn(
              'glass fixed z-50 flex flex-col overflow-hidden',
              desktop ? 'inset-y-3 right-3 rounded-2xl' : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl',
              className,
            )}
            style={desktop ? { width } : undefined}
            initial={desktop ? { x: 40, opacity: 0 } : { y: '100%' }}
            animate={desktop ? { x: 0, opacity: 1 } : { y: 0 }}
            exit={desktop ? { x: 40, opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            {!desktop && <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-line-strong" />}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0 flex-1">{title}</div>
              <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 safe-bottom">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
