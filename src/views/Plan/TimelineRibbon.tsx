import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Cluster } from '@/domain/clustering';
import { REGION_LABELS, type Conference, type Region, type Rep, type ScoreResult, type Tier } from '@/domain/types';
import { TIER_COLOR } from '@/components/ui/Badge';
import { fmtDateRange } from '@/lib/format';
import { cn } from '@/lib/cn';

export type RibbonMode = 'region' | 'rep';

interface Lane {
  bars: Conference[];
}

interface Row {
  key: string;
  label: string;
  color?: string;
  lanes: Lane[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86_400_000;
const REGION_ORDER: Region[] = ['EMEA', 'NA', 'APAC', 'MEA', 'LATAM', 'IL'];

/** Planned bars carry a text label to their right, so they reserve room on the lane. */
const LABEL_DAYS = 34;

function reservedEnd(c: Conference): number {
  const end = Date.parse(c.endDate);
  return c.status === 'planned' ? Math.max(end, Date.parse(c.startDate) + LABEL_DAYS * DAY) : end + 3 * DAY;
}

function packLanes(events: Conference[]): Lane[] {
  const lanes: Lane[] = [];
  for (const c of [...events].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const start = Date.parse(c.startDate);
    let lane = lanes.find((l) => {
      const last = l.bars[l.bars.length - 1]!;
      return reservedEnd(last) < start;
    });
    if (!lane) {
      lane = { bars: [] };
      lanes.push(lane);
    }
    lane.bars.push(c);
  }
  return lanes;
}

export function TimelineRibbon({
  conferences,
  scores,
  reps,
  clusters,
  mode,
  today,
  onOpen,
}: {
  conferences: Conference[];
  scores: Map<string, ScoreResult>;
  reps: Rep[];
  clusters: Cluster[];
  mode: RibbonMode;
  today: string;
  onOpen: (id: string) => void;
}) {
  const start = useMemo(() => {
    const d = new Date(today + 'T00:00:00Z');
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }, [today]);
  const end = useMemo(() => {
    const d = new Date(start);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 12, 1);
  }, [start]);
  const span = end - start;
  const x = (iso: string) => Math.max(0, Math.min(100, ((Date.parse(iso) - start) / span) * 100));

  const months = useMemo(() => {
    const out: { label: string; left: number; year: number; month: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1);
      out.push({ label: MONTHS[new Date(t).getUTCMonth()]!, left: ((t - start) / span) * 100, year: new Date(t).getUTCFullYear(), month: new Date(t).getUTCMonth() });
    }
    return out;
  }, [start, span]);

  const visible = useMemo(
    () => conferences.filter((c) => c.status !== 'skipped' && (scores.get(c.id)?.tier ?? 'skip') !== 'skip' && Date.parse(c.endDate) >= start && Date.parse(c.startDate) < end),
    [conferences, scores, start, end],
  );

  const rows = useMemo<Row[]>(() => {
    if (mode === 'region') {
      return REGION_ORDER.map((r) => ({ key: r, label: REGION_LABELS[r], lanes: packLanes(visible.filter((c) => c.region === r)) })).filter((r) => r.lanes.length > 0);
    }
    const byRep: Row[] = reps.map((rep) => ({
      key: rep.id,
      label: rep.name.split(' ')[0]!,
      color: rep.color,
      lanes: packLanes(visible.filter((c) => c.status === 'planned' && c.assignedRepIds.includes(rep.id))),
    }));
    const unassigned = visible.filter((c) => c.assignedRepIds.length === 0 && (c.status === 'planned' || scores.get(c.id)?.tier === 'anchor'));
    byRep.push({ key: 'unassigned', label: 'Unassigned', lanes: packLanes(unassigned) });
    return byRep.filter((r) => r.lanes.length > 0 || r.key !== 'unassigned');
  }, [mode, visible, reps, scores]);

  const LANE_H = 30;

  return (
    <div className="relative select-none">
      {/* Month header */}
      <div className="relative ml-[92px] h-7 border-b border-line">
        {months.map((m) => (
          <div key={m.label + m.year} className="absolute top-0 flex h-full items-center border-l border-line pl-1.5 text-[11px] font-medium text-ink-muted" style={{ left: `${m.left}%` }}>
            {m.label}
            {m.month === 0 && <span className="ml-1 text-ink-dim">'{String(m.year).slice(2)}</span>}
          </div>
        ))}
      </div>

      <div className="relative">
        {/* Cluster halos */}
        {clusters.map((k) => (
          <div
            key={k.id}
            className="pointer-events-none absolute bottom-0 top-0 z-0 rounded-md border-x border-indigo/30 bg-indigo/[0.07]"
            style={{ left: `calc(92px + (100% - 92px) * ${x(k.startDate) / 100})`, width: `calc((100% - 92px) * ${(x(k.endDate) - x(k.startDate)) / 100} + 6px)` }}
          >
            <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded-b-md bg-indigo/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-indigo">{k.label}</span>
          </div>
        ))}

        {/* Today marker */}
        <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-accent/70" style={{ left: `calc(92px + (100% - 92px) * ${x(today) / 100})` }}>
          <span className="absolute -left-[18px] -top-0 rounded-b bg-accent px-1 text-[9px] font-bold uppercase tracking-wider text-bg">today</span>
        </div>

        {rows.map((row) => (
          <div key={row.key} className="relative flex border-b border-line/70" style={{ minHeight: Math.max(1, row.lanes.length) * LANE_H + 12 }}>
            <div className="sticky left-0 z-10 flex w-[92px] shrink-0 items-center gap-1.5 pr-2 text-[12px] font-medium text-ink-muted">
              {row.color && <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />}
              <span className="truncate">{row.label}</span>
            </div>
            <div className="relative min-w-0 flex-1">
              {months.map((m) => (
                <div key={m.label + m.year} className="absolute bottom-0 top-0 border-l border-line/40" style={{ left: `${m.left}%` }} />
              ))}
              {row.lanes.length === 0 && <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-line" />}
              {row.lanes.map((lane, li) =>
                lane.bars.map((c) => {
                  const r = scores.get(c.id)!;
                  const left = x(c.startDate);
                  const width = Math.max(1.1, x(c.endDate) - left + 0.4);
                  const planned = c.status === 'planned';
                  const title = `${c.name}\n${fmtDateRange(c.startDate, c.endDate)} · ${c.city}\n${r.tier}${planned ? ' · planned' : ''}`;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + li * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute z-10 flex items-center gap-1.5"
                      style={{ left: `${left}%`, top: 5 + li * LANE_H }}
                    >
                      <button
                        type="button"
                        onClick={() => onOpen(c.id)}
                        title={title}
                        className={cn('block h-[22px] rounded-md border transition-transform hover:z-30 hover:scale-110', planned && 'shadow-[0_0_0_2px_rgba(11,13,18,0.9)]')}
                        style={{
                          width: `max(12px, ${width}%)`,
                          minWidth: 12,
                          background: planned ? TIER_COLOR[r.tier] : `color-mix(in srgb, ${TIER_COLOR[r.tier]} 18%, transparent)`,
                          borderColor: planned ? TIER_COLOR[r.tier] : `color-mix(in srgb, ${TIER_COLOR[r.tier]} 55%, transparent)`,
                        }}
                      />
                      {planned && (
                        <button type="button" onClick={() => onOpen(c.id)} title={title} className="max-w-[112px] truncate text-left text-[10.5px] font-semibold leading-none text-ink hover:text-accent-bright">
                          {c.series === c.name ? c.name : c.name.replace(/\s*\d{4}$/, '')}
                        </button>
                      )}
                    </motion.div>
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function tierLegend(): { tier: Tier; color: string }[] {
  return (['anchor', 'cover', 'opportunistic'] as Tier[]).map((t) => ({ tier: t, color: TIER_COLOR[t] }));
}
