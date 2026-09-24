import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { ArcClass, ConferenceStatus, Interest, Tier } from '@/domain/types';
import { ARC_LABELS, TIER_LABELS } from '@/domain/types';

export const TIER_COLOR: Record<Tier, string> = {
  anchor: 'var(--color-tier-anchor)',
  cover: 'var(--color-tier-cover)',
  opportunistic: 'var(--color-tier-opportunistic)',
  skip: 'var(--color-tier-skip)',
};

const TIER_CLASS: Record<Tier, string> = {
  anchor: 'bg-accent-soft text-accent-bright border-accent/30',
  cover: 'bg-teal-soft text-teal border-teal/30',
  opportunistic: 'bg-indigo-soft text-indigo border-indigo/30',
  skip: 'bg-surface-2 text-ink-dim border-line',
};

export function Badge({ children, className, tone = 'neutral' }: { children: ReactNode; className?: string; tone?: 'neutral' | 'accent' | 'teal' | 'rose' | 'indigo' }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-muted border-line',
    accent: 'bg-accent-soft text-accent-bright border-accent/30',
    teal: 'bg-teal-soft text-teal border-teal/30',
    rose: 'bg-rose-soft text-rose border-rose/30',
    indigo: 'bg-indigo-soft text-indigo border-indigo/30',
  };
  return <span className={cn('inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tracking-wide', tones[tone], className)}>{children}</span>;
}

const TIER_SHORT: Record<Tier, string> = { anchor: 'Anchor', cover: 'Cover', opportunistic: 'Opp.', skip: 'Skip' };

export function TierBadge({ tier, className, short }: { tier: Tier; className?: string; short?: boolean }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold uppercase tracking-wider', TIER_CLASS[tier], className)} title={TIER_LABELS[tier]}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TIER_COLOR[tier] }} />
      {short ? TIER_SHORT[tier] : TIER_LABELS[tier]}
    </span>
  );
}

const STATUS_CLASS: Record<ConferenceStatus, string> = {
  planned: 'bg-teal-soft text-teal border-teal/30',
  considering: 'bg-surface-2 text-ink-muted border-line',
  attended: 'bg-indigo-soft text-indigo border-indigo/30',
  skipped: 'bg-surface-2 text-ink-dim border-line line-through',
};

export const STATUS_LABEL: Record<ConferenceStatus, string> = {
  planned: 'Planned',
  considering: 'Considering',
  attended: 'Attended',
  skipped: 'Skipped',
};

export function StatusBadge({ status, className }: { status: ConferenceStatus; className?: string }) {
  return <span className={cn('inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-semibold', STATUS_CLASS[status], className)}>{STATUS_LABEL[status]}</span>;
}

const ARC_CLASS: Record<ArcClass, string> = {
  new: 'bg-surface-2 text-ink-muted border-line',
  warming: 'bg-accent-soft text-accent-bright border-accent/30',
  stalled: 'bg-indigo-soft text-indigo border-indigo/30',
  'tire-kicker': 'bg-rose-soft text-rose border-rose/30',
  'job-change': 'bg-teal-soft text-teal border-teal/30',
};

export const ARC_COLOR: Record<ArcClass, string> = {
  new: 'var(--color-ink-muted)',
  warming: 'var(--color-accent)',
  stalled: 'var(--color-indigo)',
  'tire-kicker': 'var(--color-rose)',
  'job-change': 'var(--color-teal)',
};

export function ArcBadge({ arc, className }: { arc: ArcClass; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold', ARC_CLASS[arc], className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ARC_COLOR[arc] }} />
      {ARC_LABELS[arc]}
    </span>
  );
}

/** ISO country code as a small tag. Flag emoji render inconsistently on Windows, so we don't rely on them. */
export function CountryTag({ code, className }: { code: string; className?: string }) {
  return <span className={cn('inline-block rounded border border-line bg-bg px-1 font-mono text-[9.5px] uppercase leading-4 tracking-wider text-ink-dim', className)}>{code}</span>;
}

export const INTEREST_COLOR: Record<Interest, string> = { hot: 'var(--color-hot)', warm: 'var(--color-warm)', cold: 'var(--color-cold)' };

export function InterestDot({ interest, className }: { interest: Interest; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full', className)} style={{ background: INTEREST_COLOR[interest] }} title={interest} />;
}
