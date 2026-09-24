import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { TierBadge, StatusBadge } from '@/components/ui/Badge';
import type { Conference } from '@/domain/types';
import { useScores, useToday, useUpcoming } from '@/store/selectors';
import { daysUntil, fmtDateRange, fmtRelativeDays } from '@/lib/format';
import { cn } from '@/lib/cn';

export function ConferencePicker({ open, onClose, current, onPick }: { open: boolean; onClose: () => void; current?: Conference; onPick: (c: Conference) => void }) {
  const upcoming = useUpcoming();
  const scores = useScores();
  const today = useToday();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return upcoming
      .filter((c) => c.status !== 'skipped')
      .filter((c) => !s || `${c.name} ${c.city}`.toLowerCase().includes(s))
      .sort((a, b) => (a.status === 'planned' ? 0 : 1) - (b.status === 'planned' ? 0 : 1) || a.startDate.localeCompare(b.startDate))
      .slice(0, 30);
  }, [upcoming, q]);

  return (
    <Drawer open={open} onClose={onClose} title={<p className="font-semibold text-ink">Where are you?</p>}>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an event" className="h-12 w-full rounded-xl border border-line bg-bg-elevated pl-9 pr-3 text-[16px] text-ink placeholder:text-ink-dim focus:border-accent/60 focus:outline-none" />
      </div>
      <ul className="flex flex-col gap-1.5">
        {list.map((c) => {
          const live = c.startDate <= today && c.endDate >= today;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(c);
                  onClose();
                }}
                className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors', current?.id === c.id ? 'border-accent/50 bg-accent-soft' : 'border-line bg-bg-elevated hover:border-line-strong')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{c.name}</span>
                  <span className="block text-[12px] text-ink-muted">
                    {fmtDateRange(c.startDate, c.endDate)} · {c.city} · {live ? <span className="text-rose">live now</span> : fmtRelativeDays(daysUntil(c.startDate, today))}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <TierBadge tier={scores.get(c.id)?.tier ?? 'skip'} short />
                  <StatusBadge status={c.status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
