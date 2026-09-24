import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  color?: string; // css color for the dot
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

/** Toggle pill used for filters and quick picks. */
export function Chip({ active, onClick, children, color, count, size = 'sm', className, title }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all active:scale-[0.97]',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-9 px-3.5 text-[13.5px]',
        active ? 'border-accent/50 bg-accent-soft text-accent-bright' : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
      {count !== undefined && <span className={cn('rounded-full px-1.5 text-[10.5px]', active ? 'bg-accent/20' : 'bg-surface-2 text-ink-dim')}>{count}</span>}
    </button>
  );
}
