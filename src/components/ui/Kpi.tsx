import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CountUp } from './CountUp';

export interface KpiProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  sub?: ReactNode;
  icon?: ReactNode;
  to?: string;
  tone?: 'default' | 'accent' | 'teal' | 'rose';
  index?: number;
}

const TONE = {
  default: 'text-ink',
  accent: 'text-accent-bright',
  teal: 'text-teal',
  rose: 'text-rose',
};

/** Stat tile: label, big proportional-figure value, one-line context. */
export function Kpi({ label, value, format, sub, icon, to, tone = 'default', index = 0 }: KpiProps) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('card group relative flex h-full flex-col justify-between gap-2 p-4', to && 'transition-colors hover:border-line-strong hover:bg-surface-2')}
    >
      <div className="flex items-center justify-between text-[12px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {to && <ArrowUpRight className="h-3.5 w-3.5 text-ink-dim opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <div>
        <p className={cn('text-[30px] font-semibold leading-none tracking-tight', TONE[tone])}>
          <CountUp value={value} format={format} />
        </p>
        {sub && <p className="mt-1.5 truncate text-[12px] text-ink-dim">{sub}</p>}
      </div>
    </motion.div>
  );
  return to ? (
    <NavLink to={to} className="block h-full">
      {body}
    </NavLink>
  ) : (
    body
  );
}
