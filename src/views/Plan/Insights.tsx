import { motion } from 'motion/react';
import { AlertTriangle, Compass, Luggage, Route, UserX, Users } from 'lucide-react';
import type { Cluster, Collision, Gap, RepLoad } from '@/domain/clustering';
import { REGION_LABELS, type Conference, type ScoreResult } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/Badge';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { toast } from '@/components/ui/Toast';
import { fmtDate, fmtDateRange, fmtUsd, plural } from '@/lib/format';
import { cn } from '@/lib/cn';

function Card({ icon, title, tone = 'neutral', children, index }: { icon: React.ReactNode; title: React.ReactNode; tone?: 'neutral' | 'indigo' | 'rose' | 'accent'; children: React.ReactNode; index: number }) {
  const tones = {
    neutral: 'border-line',
    indigo: 'border-indigo/30 bg-indigo/[0.05]',
    rose: 'border-rose/30 bg-rose/[0.05]',
    accent: 'border-accent/30 bg-accent/[0.05]',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn('rounded-xl border bg-bg-elevated p-3.5', tones[tone])}
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        {icon} {title}
      </p>
      <div className="mt-2 text-[12.5px] leading-snug text-ink-muted">{children}</div>
    </motion.div>
  );
}

function EventLink({ c, onOpen }: { c: Conference; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(c.id)} className="font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-accent">
      {c.name}
    </button>
  );
}

export function ClusterCard({ k, byId, scores, onOpen, index }: { k: Cluster; byId: Map<string, Conference>; scores: Map<string, ScoreResult>; onOpen: (id: string) => void; index: number }) {
  const setStatus = useData((s) => s.setConferenceStatus);
  const toggleRep = useData((s) => s.toggleRep);
  const currentRepId = useSettings((s) => s.currentRepId);
  const members = k.conferenceIds.map((id) => byId.get(id)).filter((c): c is Conference => !!c);
  const lead = members[0]!;
  const planAll = () => {
    const repIds = lead.assignedRepIds.length ? lead.assignedRepIds : [currentRepId];
    for (const c of members) {
      if (c.status !== 'planned') setStatus(c.id, 'planned');
      for (const r of repIds) if (!c.assignedRepIds.includes(r)) toggleRep(c.id, r);
    }
    toast.success('Planned as one trip', `${members.length} events, ${fmtDateRange(k.startDate, k.endDate)}.`);
  };
  const saves = k.savings.usd >= 0 ? `saves ${plural(k.savings.travelDays, 'travel day')} and ${fmtUsd(k.savings.usd)}` : `saves ${plural(k.savings.travelDays, 'travel day')}, costs about ${fmtUsd(-k.savings.usd)} more in hotel`;
  return (
    <Card icon={<Route className="h-4 w-4 text-indigo" />} title={k.label} tone="indigo" index={index}>
      <p>
        {members.length} events within {plural(k.spanDays, 'day')}, {fmtDateRange(k.startDate, k.endDate)}. One trip {saves}.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {members.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <TierBadge tier={scores.get(c.id)!.tier} short />
            <EventLink c={c} onOpen={onOpen} />
            <span className="text-ink-dim">{fmtDate(c.startDate, false)}</span>
            {c.status === 'planned' && <span className="text-[10.5px] font-semibold uppercase tracking-wider text-teal">planned</span>}
          </li>
        ))}
      </ul>
      {!k.fullyPlanned && (
        <Button size="sm" variant="secondary" className="mt-3" icon={<Luggage className="h-3.5 w-3.5" />} onClick={planAll}>
          Plan as one trip
        </Button>
      )}
    </Card>
  );
}

export function GapCard({ g, scores, onOpen, index }: { g: Gap; scores: Map<string, ScoreResult>; onOpen: (id: string) => void; index: number }) {
  const setStatus = useData((s) => s.setConferenceStatus);
  const top = g.candidates[0];
  return (
    <Card icon={<Compass className="h-4 w-4 text-rose" />} title={`${REGION_LABELS[g.region]}, ${g.quarter.label}`} tone="rose" index={index}>
      {g.kind === 'no-events' ? (
        <p>Nothing on the radar here. Try Discover to find events in this region, or accept the gap.</p>
      ) : (
        <>
          <p>Nothing planned, but {plural(g.candidates.length, 'candidate')} on the list. Best fit:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {g.candidates.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <TierBadge tier={scores.get(c.id)!.tier} short />
                <EventLink c={c} onOpen={onOpen} />
                <span className="text-ink-dim">{fmtDate(c.startDate, false)}</span>
              </li>
            ))}
          </ul>
          {top && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => {
                setStatus(top.id, 'planned');
                toast.success(`Planned ${top.name}`, 'Assign a rep from the event details.');
              }}
            >
              Plan {top.series}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

export function CollisionCard({ k, onOpen, index }: { k: Collision; onOpen: (id: string) => void; index: number }) {
  const reps = useData((s) => s.reps);
  const shared = k.sharedRepIds.map((id) => reps.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
  return (
    <Card icon={<AlertTriangle className="h-4 w-4 text-accent" />} title="Same week, different continents" tone="accent" index={index}>
      <p>
        <EventLink c={k.a} onOpen={onOpen} /> and <EventLink c={k.b} onOpen={onOpen} /> overlap ({Math.round(k.distanceKm).toLocaleString('en-US')} km apart).
        {shared.length > 0 ? ` ${shared.map((r) => r.name.split(' ')[0]).join(' and ')} is on both. Split the team.` : ' Nobody is double-booked yet; keep it that way when assigning.'}
      </p>
    </Card>
  );
}

export function LoadCard({ load, onOpen, index }: { load: RepLoad; onOpen: (id: string) => void; index: number }) {
  return (
    <Card icon={<Users className="h-4 w-4" style={{ color: load.rep.color }} />} title={`${load.rep.name.split(' ')[0]} is stretched`} index={index}>
      <p>
        {load.peak.count} events in three weeks from {fmtDate(load.peak.windowStart)}: {load.peak.events.map((c, i) => (
          <span key={c.id}>
            {i > 0 && ', '}
            <EventLink c={c} onOpen={onOpen} />
          </span>
        ))}
        . {plural(load.nights, 'hotel night')} and {plural(load.travelDays, 'travel day')} this year.
      </p>
    </Card>
  );
}

export function UnassignedCard({ list, onOpen, index }: { list: Conference[]; onOpen: (id: string) => void; index: number }) {
  return (
    <Card icon={<UserX className="h-4 w-4 text-accent" />} title={`${plural(list.length, 'anchor event')} with nobody assigned`} index={index}>
      <ul className="flex flex-col gap-1">
        {list.slice(0, 5).map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <EventLink c={c} onOpen={onOpen} />
            <span className="text-ink-dim">{fmtDate(c.startDate)}</span>
          </li>
        ))}
        {list.length > 5 && <li className="text-ink-dim">and {list.length - 5} more</li>}
      </ul>
    </Card>
  );
}
