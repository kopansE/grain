import { useMemo } from 'react';
import { NavLink } from 'react-router';
import { TIER_COLOR } from '@/components/ui/Badge';
import { TIER_LABELS, type Conference, type Tier } from '@/domain/types';
import { useScores, useToday, useUpcoming } from '@/store/selectors';
import { cn } from '@/lib/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthCell {
  key: string;
  label: string;
  year: number;
  events: { c: Conference; tier: Tier }[];
}

/** Twelve months from today: one column per month, one square per event, colored by tier. Planned events are solid, the rest faded. */
export function CoverageStrip() {
  const upcoming = useUpcoming();
  const scores = useScores();
  const today = useToday();

  const months = useMemo<MonthCell[]>(() => {
    const start = new Date(today + 'T00:00:00Z');
    const out: MonthCell[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const key = d.toISOString().slice(0, 7);
      const events = upcoming
        .filter((c) => c.status !== 'skipped' && c.startDate.slice(0, 7) === key)
        .map((c) => ({ c, tier: scores.get(c.id)?.tier ?? 'skip' }))
        .filter((x) => x.tier !== 'skip')
        .sort((a, b) => (a.c.status === 'planned' ? -1 : 1) - (b.c.status === 'planned' ? -1 : 1));
      out.push({ key, label: MONTHS[d.getUTCMonth()]!, year: d.getUTCFullYear(), events });
    }
    return out;
  }, [upcoming, scores, today]);

  const max = Math.max(4, ...months.map((m) => m.events.length));
  const tiers = (Object.keys(TIER_LABELS) as Tier[]).filter((t) => t !== 'skip');

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Next 12 months</p>
        <NavLink to="/plan" className="text-[12px] text-ink-muted hover:text-ink">
          Open plan
        </NavLink>
      </div>
      <div className="mt-4 grid grid-cols-12 gap-1.5 sm:gap-2">
        {months.map((m) => (
          <NavLink key={m.key} to="/plan" className="group flex flex-col items-center gap-1.5" title={m.events.map((e) => `${e.c.name} (${TIER_LABELS[e.tier]}${e.c.status === 'planned' ? ', planned' : ''})`).join('\n') || 'No events'}>
            <div className="flex h-[92px] w-full flex-col-reverse items-stretch gap-[3px]">
              {m.events.slice(0, max).map((e) => (
                <span
                  key={e.c.id}
                  className={cn('block w-full rounded-[3px] transition-transform group-hover:scale-x-110', e.c.status === 'planned' ? 'opacity-100' : 'opacity-35')}
                  style={{ height: `${Math.max(8, 92 / max - 3)}px`, background: TIER_COLOR[e.tier] }}
                />
              ))}
              {m.events.length === 0 && <span className="mb-0 block h-[3px] w-full rounded-full bg-surface-3" />}
            </div>
            <span className={cn('text-[10.5px] font-medium', m.events.some((e) => e.c.status === 'planned') ? 'text-ink' : 'text-ink-dim')}>
              {m.label}
              {m.label === 'Jan' && <span className="ml-0.5 text-ink-dim">'{String(m.year).slice(2)}</span>}
            </span>
          </NavLink>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        {tiers.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: TIER_COLOR[t] }} /> {TIER_LABELS[t]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-ink opacity-35" /> considering
        </span>
      </div>
    </div>
  );
}
