import { cn } from '@/lib/cn';
import type { Rep } from '@/domain/types';
import { initials as toInitials } from '@/lib/format';

export function Avatar({ name, color, size = 28, className, title }: { name: string; color?: string; size?: number; className?: string; title?: string }) {
  const bg = color ?? 'var(--color-surface-3)';
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-bg ring-2 ring-bg', className)}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38, color: color ? '#0b0d12' : 'var(--color-ink)' }}
      title={title ?? name}
    >
      {toInitials(name)}
    </span>
  );
}

export function RepAvatars({ reps, size = 26, max = 4, className }: { reps: Rep[]; size?: number; max?: number; className?: string }) {
  const shown = reps.slice(0, max);
  const extra = reps.length - shown.length;
  if (reps.length === 0) return null;
  return (
    <span className={cn('inline-flex items-center', className)}>
      {shown.map((r, i) => (
        <Avatar key={r.id} name={r.name} color={r.color} size={size} className={i > 0 ? '-ml-2' : ''} title={r.name} />
      ))}
      {extra > 0 && (
        <span className="-ml-2 inline-flex items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-muted ring-2 ring-bg" style={{ width: size, height: size }}>
          +{extra}
        </span>
      )}
    </span>
  );
}
