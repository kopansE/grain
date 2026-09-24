import { useMemo, useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { TIER_COLOR } from '@/components/ui/Badge';
import { TIER_LABELS, type Tier } from '@/domain/types';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { usePlanningInsights, useScores, useToday, useUpcoming } from '@/store/selectors';
import { estimateTravel, eventDays } from '@/lib/geo';
import { fmtUsd, fmtUsdCompact, plural } from '@/lib/format';
import { ConferenceDrawerFromQuery, useOpenConference } from '@/views/Explore/ConferenceDrawer';
import { TimelineRibbon, type RibbonMode } from './TimelineRibbon';
import { CoverageHeatmap } from './CoverageHeatmap';
import { ClusterCard, CollisionCard, GapCard, HolidayCard, LoadCard, UnassignedCard } from './Insights';
import { holidayClashes } from '@/domain/holidays';
import { downloadIcs } from '@/lib/ics';
import { Button } from '@/components/ui/Button';
import { CalendarPlus } from 'lucide-react';

export default function Plan() {
  const upcoming = useUpcoming();
  const scores = useScores();
  const reps = useData((s) => s.reps);
  const today = useToday();
  const homeBase = useSettings((s) => s.homeBase);
  const budget = useSettings((s) => s.annualBudgetUsd);
  const update = useSettings((s) => s.update);
  const { clusters, gaps, collisions, loads, unassigned, grid } = usePlanningInsights();
  const [mode, setMode] = useState<RibbonMode>('region');
  const openConference = useOpenConference();
  const byId = useMemo(() => new Map(upcoming.map((c) => [c.id, c])), [upcoming]);

  const planned = useMemo(() => upcoming.filter((c) => c.status === 'planned'), [upcoming]);
  const spend = useMemo(
    () =>
      planned.map((c) => {
        const travel = estimateTravel(c, eventDays(c.startDate, c.endDate), homeBase);
        const perRep = Math.max(1, c.assignedRepIds.length);
        return { c, ticket: c.costs.ticketUsd * perRep, booth: c.costs.boothUsd ?? 0, travel: travel.totalUsd * perRep };
      }),
    [planned, homeBase],
  );
  const total = spend.reduce((a, s) => a + s.ticket + s.booth + s.travel, 0);
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  const stretched = loads.filter((l) => l.peak.count >= 3);
  const clashes = useMemo(() => holidayClashes(upcoming.filter((c) => c.status === 'planned' || scores.get(c.id)?.tier === 'anchor')), [upcoming, scores]);
  // Only collisions that actually double-book someone, or pit two planned trips against each other.
  const realCollisions = collisions.filter((k) => k.sharedRepIds.length > 0 || (k.a.status === 'planned' && k.b.status === 'planned'));
  const strongGaps = gaps.filter((g) => g.kind === 'no-plans').sort((a, b) => (scores.get(b.candidates[0]!.id)?.score ?? 0) - (scores.get(a.candidates[0]!.id)?.score ?? 0)).slice(0, 4);
  const emptyGaps = gaps.filter((g) => g.kind === 'no-events').slice(0, 2);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-[34px] leading-none text-ink">The year, on one line.</h2>
          <p className="mt-1.5 text-[14px] text-ink-muted">
            {plural(planned.length, 'planned trip')} · {plural(clusters.length, 'cluster')} that could be one trip · {plural(gaps.filter((g) => g.kind === 'no-plans').length, 'quarter')} with nothing planned
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 text-[11px] text-ink-muted sm:flex">
            {(['anchor', 'cover', 'opportunistic'] as Tier[]).map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: TIER_COLOR[t] }} /> {TIER_LABELS[t]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm border border-ink-dim bg-ink/10" /> considering
            </span>
          </div>
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'region', label: 'By region' },
              { value: 'rep', label: 'By rep' },
            ]}
          />
          <Button size="sm" icon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => downloadIcs(planned, 'grain-orbit-planned-trips.ics')} disabled={planned.length === 0} title="Download every planned trip as a calendar file">
            Calendar
          </Button>
        </div>
      </header>

      <div className="card overflow-x-auto p-4">
        <div className="min-w-[860px]">
          <TimelineRibbon conferences={upcoming} scores={scores} reps={reps} clusters={clusters} mode={mode} today={today} onOpen={openConference} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <div className="card p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Coverage by quarter and region</p>
            <div className="mt-3">
              <CoverageHeatmap grid={grid} gaps={gaps} onPick={(cell) => cell.candidates[0] && openConference(cell.candidates[0].id)} />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Budget</p>
              <label className="flex items-center gap-2 text-[12px] text-ink-muted">
                Annual budget
                <input
                  type="number"
                  value={budget}
                  step={10000}
                  onChange={(e) => update({ annualBudgetUsd: Number(e.target.value) || 0 })}
                  className="h-8 w-28 rounded-lg border border-line bg-bg-elevated px-2 text-right text-[12.5px] text-ink focus:border-accent/60 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold leading-none text-ink">{fmtUsdCompact(total)}</span>
              <span className="text-[12.5px] text-ink-muted">of {fmtUsdCompact(budget)} committed across {plural(planned.length, 'planned trip')}</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: pct > 95 ? 'var(--color-rose)' : pct > 80 ? 'var(--color-accent)' : 'var(--color-teal)' }} />
            </div>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {spend
                .sort((a, b) => b.ticket + b.booth + b.travel - (a.ticket + a.booth + a.travel))
                .map(({ c, ticket, booth, travel }) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <button type="button" onClick={() => openConference(c.id)} className="truncate text-ink-muted hover:text-ink">
                      {c.name}
                    </button>
                    <span className="numeric shrink-0 font-mono text-[11px] text-ink" title={`ticket ${fmtUsd(ticket)} · booth ${fmtUsd(booth)} · travel ${fmtUsd(travel)}`}>
                      {fmtUsdCompact(ticket + booth + travel)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Insights, computed from the calendar</p>
          {clusters.map((k, i) => (
            <ClusterCard key={k.id} k={k} byId={byId} scores={scores} onOpen={openConference} index={i} />
          ))}
          {realCollisions.map((k, i) => (
            <CollisionCard key={`${k.a.id}-${k.b.id}`} k={k} onOpen={openConference} index={clusters.length + i} />
          ))}
          {clashes.length > 0 && <HolidayCard clashes={clashes} onOpen={openConference} index={clusters.length + realCollisions.length} />}
          {strongGaps.map((g, i) => (
            <GapCard key={`${g.quarter.id}-${g.region}`} g={g} scores={scores} onOpen={openConference} index={clusters.length + realCollisions.length + i} />
          ))}
          {stretched.map((l, i) => (
            <LoadCard key={l.rep.id} load={l} onOpen={openConference} index={10 + i} />
          ))}
          {unassigned.length > 0 && <UnassignedCard list={unassigned} onOpen={openConference} index={14} />}
          {emptyGaps.map((g, i) => (
            <GapCard key={`${g.quarter.id}-${g.region}`} g={g} scores={scores} onOpen={openConference} index={16 + i} />
          ))}
        </aside>
      </div>

      <ConferenceDrawerFromQuery />
    </div>
  );
}
