import { motion, LayoutGroup } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

export function Segmented<T extends string>({ value, options, onChange, className, size = 'md' }: { value: T; options: SegmentedOption<T>[]; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div className={cn('inline-flex rounded-xl border border-line bg-bg-elevated p-1', className)} role="tablist">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'relative flex-1 whitespace-nowrap rounded-lg font-medium transition-colors',
                size === 'sm' ? 'h-7 px-2.5 text-[12px]' : size === 'lg' ? 'h-12 px-4 text-[15px]' : 'h-8 px-3 text-[13px]',
                active ? 'text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              {active && <motion.span layoutId="seg-active" className="absolute inset-0 rounded-lg bg-surface-3 ring-1 ring-line-strong" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {o.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: o.color }} />}
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
