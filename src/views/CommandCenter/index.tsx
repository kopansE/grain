import { Suspense, lazy, useMemo, useState } from 'react';
import { Anchor, CalendarCheck, CloudOff, Flame, Users } from 'lucide-react';
import { Kpi } from '@/components/ui/Kpi';
import { TIER_COLOR } from '@/components/ui/Badge';
import { TIER_LABELS, type Tier } from '@/domain/types';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useArcs, usePlanningInsights, useScores, useToday, useUpcoming } from '@/store/selectors';
import { estimateTravel, eventDays } from '@/lib/geo';
import { fmtUsdCompact, plural } from '@/lib/format';
import { ConferenceDrawerFromQuery, useOpenConference } from '@/views/Explore/ConferenceDrawer';
import { UpNext } from './UpNext';
import { RelationshipRadar } from './RelationshipRadar';
import { CoverageStrip } from './CoverageStrip';
import { NeedsAttention } from './NeedsAttention';

const GlobeHero = lazy(() => import('@/components/globe/GlobeHero'));

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function CommandCenter() {
  const openConference = useOpenConference();
  const today = useToday();
  const upcoming = useUpcoming();
  const scores = useScores();
  const arcs = useArcs();
  const encounters = useData((s) => s.encounters);
  const reps = useData((s) => s.reps);
  const currentRepId = useSettings((s) => s.currentRepId);
  const homeBase = useSettings((s) => s.homeBase);
  const budget = useSettings((s) => s.annualBudgetUsd);
  const { clusters } = usePlanningInsights();
  const [focus, setFocus] = useState<string | undefined>();

  const rep = reps.find((r) => r.id === currentRepId);
  const yearEnd = useMemo(() => new Date(Date.parse(today) + 365 * 86_400_000).toISOString().slice(0, 10), [today]);

  const kpis = useMemo(() => {
    const inYear = upcoming.filter((c) => c.status !== 'skipped' && c.startDate <= yearEnd);
    const anchors = inYear.filter((c) => scores.get(c.id)?.tier === 'anchor').length;
    const planned = inYear.filter((c) => c.status === 'planned');
    const spend = planned.reduce((a, c) => a + c.costs.ticketUsd + (c.costs.boothUsd ?? 0) + estimateTravel(c, eventDays(c.startDate, c.endDate), homeBase).totalUsd, 0);
    const yearAgo = new Date(Date.parse(today) - 365 * 86_400_000).toISOString().slice(0, 10);
    const leads = encounters.filter((e) => e.capturedAt.slice(0, 10) >= yearAgo);
    const ninety = new Date(Date.parse(today) - 90 * 86_400_000).toISOString().slice(0, 10);
    const recent = leads.filter((e) => e.capturedAt.slice(0, 10) >= ninety).length;
    let warming = 0;
    let jobChange = 0;
    let tireKickers = 0;
    for (const a of arcs.values()) {
      if (a.classification === 'warming') warming++;
      if (a.classification === 'job-change') jobChange++;
      if (a.classification === 'tire-kicker') tireKickers++;
    }
    const unsynced = encounters.filter((e) => e.hubspot?.status !== 'synced').length;
    return { events: inYear.length, anchors, planned: planned.length, spend, leads: leads.length, recent, warming, jobChange, tireKickers, unsynced };
  }, [upcoming, scores, encounters, arcs, homeBase, today, yearEnd]);

  const next60 = upcoming.filter((c) => c.status === 'planned' && c.startDate <= new Date(Date.parse(today) + 60 * 86_400_000).toISOString().slice(0, 10)).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="display text-[34px] leading-none text-ink">
          {greeting()}, {rep?.name.split(' ')[0] ?? 'there'}.
        </h2>
        <p className="text-[14px] text-ink-muted">
          {plural(next60, 'planned event')} in the next 60 days, {plural(kpis.warming, 'warming relationship')} to close, {plural(kpis.unsynced, 'lead')} not yet in HubSpot.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi index={0} label="Events, next 12 months" value={kpis.events} sub={`${kpis.anchors} anchors worth a booth`} icon={<Anchor className="h-3.5 w-3.5" />} to="/conferences" />
        <Kpi index={1} label="Planned trips" value={kpis.planned} sub={`${fmtUsdCompact(kpis.spend)} of ${fmtUsdCompact(budget)} budget`} icon={<CalendarCheck className="h-3.5 w-3.5" />} to="/plan" tone="teal" />
        <Kpi index={2} label="Leads, last 12 months" value={kpis.leads} sub={`${kpis.recent} in the last 90 days`} icon={<Users className="h-3.5 w-3.5" />} to="/contacts" />
        <Kpi index={3} label="Warming relationships" value={kpis.warming} sub={`${kpis.jobChange} job changes · ${kpis.tireKickers} tire-kickers`} icon={<Flame className="h-3.5 w-3.5" />} to="/contacts?arc=warming" tone="accent" />
        <Kpi index={4} label="Not in HubSpot" value={kpis.unsynced} sub="one tap each, or push all" icon={<CloudOff className="h-3.5 w-3.5" />} to="/contacts?sync=unsynced" tone={kpis.unsynced > 0 ? 'rose' : 'default'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="card relative h-[420px] overflow-hidden sm:h-[520px] xl:h-auto xl:min-h-[600px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(94,203,184,0.07),transparent_70%)]" />
          <Suspense fallback={<GlobeFallback />}>
            <GlobeHero conferences={upcoming} scores={scores} clusters={clusters} homeBase={homeBase} today={today} focusId={focus} onSelect={(id) => { setFocus(id); openConference(id); }} />
          </Suspense>
          <div className="pointer-events-none absolute left-5 top-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Conference orbit</p>
            <p className="mt-1 max-w-[260px] text-[12.5px] text-ink-muted">Arcs are planned trips from {homeBase.label}. Pulses mark clusters that could be one trip.</p>
          </div>
          <div className="pointer-events-none absolute bottom-5 left-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            {(Object.keys(TIER_LABELS) as Tier[]).filter((t) => t !== 'skip').map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: TIER_COLOR[t] }} /> {TIER_LABELS[t]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white" /> Home
            </span>
          </div>
          <p className="pointer-events-none absolute bottom-5 right-5 hidden text-[11px] text-ink-dim sm:block">Drag to spin · click a pin</p>
        </div>

        <div className="flex flex-col gap-5">
          <UpNext />
          <RelationshipRadar />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <CoverageStrip />
        <NeedsAttention />
      </div>

      <ConferenceDrawerFromQuery />
    </div>
  );
}

function GlobeFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-[320px] w-[320px] animate-pulse rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(94,203,184,0.25),rgba(11,13,18,0.2)_70%)]" />
    </div>
  );
}

