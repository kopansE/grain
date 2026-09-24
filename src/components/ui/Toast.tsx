import { create } from 'zustand';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ToastItem {
  id: number;
  title: string;
  body?: string;
  kind: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let seq = 1;
export const useToast = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = seq++;
    set((s) => ({ items: [...s.items.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), t.kind === 'error' ? 7000 : 4200);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  success: (title: string, body?: string, action?: ToastItem['action']) => useToast.getState().push({ title, body, kind: 'success', action }),
  error: (title: string, body?: string) => useToast.getState().push({ title, body, kind: 'error' }),
  info: (title: string, body?: string, action?: ToastItem['action']) => useToast.getState().push({ title, body, kind: 'info', action }),
};

const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLOR = { success: 'text-teal', error: 'text-rose', info: 'text-accent' };

export function Toaster() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:top-auto lg:items-end lg:px-6">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3"
            >
              <Icon className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', COLOR[t.kind])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[12.5px] text-ink-muted">{t.body}</p>}
                {t.action && (
                  <button type="button" onClick={() => { t.action!.onClick(); dismiss(t.id); }} className="mt-1.5 text-[12.5px] font-semibold text-accent hover:underline">
                    {t.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="text-ink-dim hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
