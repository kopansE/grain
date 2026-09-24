import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center', className)}>
      {icon && <div className="mb-1 text-ink-dim">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="max-w-sm text-[13px] text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
