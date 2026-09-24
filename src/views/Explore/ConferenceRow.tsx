import { memo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Link2 } from 'lucide-react';
import type { Conference, Rep, ScoreResult } from '@/domain/types';
import { VERTICAL_LABELS } from '@/domain/types';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScoreBreakdown } from '@/components/ui/ScoreBreakdown';
import { CountryTag, StatusBadge, TierBadge } from '@/components/ui/Badge';
import { RepAvatars } from '@/components/ui/Avatar';
import { fmtCompact, fmtDateRange } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface ConferenceRowProps {
  conference: Conference;
  result: ScoreResult;
  reps: Rep[];
  onOpen: (id: string) => void;
  hostName?: string;
  index: number;
}

export const ConferenceRow = memo(function ConferenceRow({ conference: c, result, reps, onOpen, hostName, index }: ConferenceRowProps) {
  return (
    <motion.div
      layout
      layoutId={`row-${c.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38, delay: Math.min(index, 12) * 0.02 }}
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-surface-2 lg:gap-4 lg:px-4',
        c.status === 'skipped' && 'opacity-60',
      )}
      onClick={() => onOpen(c.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(c.id)}
    >
      {/* Score ring with hover breakdown */}
      <div className="relative">
        <ScoreRing score={result.score} tier={result.tier} size={46} />
        <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-64 rounded-xl border border-line-strong bg-bg-elevated p-3 shadow-card group-hover:block">
          <ScoreBreakdown result={result} compact hostName={hostName} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-[14.5px] font-semibold text-ink">{c.name}</p>
          {!c.datesConfirmed && (
            <span className="shrink-0 rounded-md border border-line bg-bg px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-dim" title="Dates estimated from the previous edition">
              est.
            </span>
          )}
          {result.piggybackOf && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-indigo/30 bg-indigo-soft px-1.5 py-0.5 text-[10px] font-semibold text-indigo" title={`Piggybacks on ${hostName ?? result.piggybackOf}`}>
              <Link2 className="h-3 w-3" /> piggyback
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
          {fmtDateRange(c.startDate, c.endDate)} · <CountryTag code={c.countryCode} /> {c.city} · {fmtCompact(c.audienceSize)} people
          <span className="hidden xl:inline"> · {c.verticals.map((v) => VERTICAL_LABELS[v]).join(', ')}</span>
        </p>
      </div>

      <div className="hidden shrink-0 sm:block">
        <TierBadge tier={result.tier} />
      </div>

      {reps.length > 0 && (
        <div className="hidden shrink-0 md:flex">
          <RepAvatars reps={reps} size={24} max={3} />
        </div>
      )}

      <div className="hidden shrink-0 xl:block">
        <StatusBadge status={c.status} />
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </motion.div>
  );
});
