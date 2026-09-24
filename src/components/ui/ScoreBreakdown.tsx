import { motion } from 'motion/react';
import type { ScoreResult } from '@/domain/types';
import { cn } from '@/lib/cn';
import { TIER_COLOR } from './Badge';

/** The six scoring components as bars. `compact` hides the notes. */
export function ScoreBreakdown({ result, compact, className, hostName }: { result: ScoreResult; compact?: boolean; className?: string; hostName?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {result.components.map((k, i) => {
        const max = k.weight * 100;
        const pct = max > 0 ? (k.contribution / max) * 100 : 0;
        return (
          <div key={k.key}>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-medium text-ink">{k.label}</span>
              <span className="numeric font-mono text-[11px] text-ink-muted">
                {Math.round(k.contribution)} <span className="text-ink-dim">/ {Math.round(max)}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: TIER_COLOR[result.tier] }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {!compact && <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">{k.note}</p>}
          </div>
        );
      })}
      {result.clusterBonus > 0 && (
        <div className="mt-1 flex items-center justify-between rounded-lg border border-indigo/30 bg-indigo-soft px-2.5 py-1.5 text-[12px]">
          <span className="font-medium text-indigo">Piggyback bonus{hostName ? ` · rides on ${hostName}` : ''}</span>
          <span className="numeric font-mono text-[11px] text-indigo">+{result.clusterBonus}</span>
        </div>
      )}
    </div>
  );
}
