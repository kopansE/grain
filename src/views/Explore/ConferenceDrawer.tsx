import { useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { ExternalLink, MapPin, Plane, Ticket, Users, Zap } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScoreBreakdown } from '@/components/ui/ScoreBreakdown';
import { ArcBadge, InterestDot, StatusBadge, TierBadge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import { Avatar } from '@/components/ui/Avatar';
import { TIER_BLURBS, VERTICAL_LABELS, type Conference, type ConferenceStatus } from '@/domain/types';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useArcs, useConference, useScores, useToday } from '@/store/selectors';
import { estimateTravel, eventDays } from '@/lib/geo';
import { daysUntil, fmtDate, fmtDateRange, fmtNumber, fmtRelativeDays, fmtUsd, fmtUsdCompact, plural } from '@/lib/format';
import { cn } from '@/lib/cn';

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-dim">
        {icon} {label}
      </p>
      <p className="numeric mt-1 text-[15px] font-semibold text-ink">{value}</p>
      {sub && <p className="text-[11.5px] text-ink-muted">{sub}</p>}
    </div>
  );
}

export function ConferenceDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const conference = useConference(id);
  return (
    <Drawer open={!!conference} onClose={onClose} title={conference ? <DrawerTitle c={conference} /> : null}>
      {conference && <DrawerBody c={conference} />}
    </Drawer>
  );
}

/** Drawer driven by a `?c=<id>` query param, so any page can open a conference without leaving its route. */
export function ConferenceDrawerFromQuery() {
  const [params, setParams] = useSearchParams();
  const id = params.get('c') ?? undefined;
  return (
    <ConferenceDrawer
      id={id}
      onClose={() => {
        const next = new URLSearchParams(params);
        next.delete('c');
        setParams(next, { replace: true });
      }}
    />
  );
}

export function useOpenConference(): (id: string) => void {
  const [params, setParams] = useSearchParams();
  return (id: string) => {
    const next = new URLSearchParams(params);
    next.set('c', id);
    setParams(next);
  };
}

function DrawerTitle({ c }: { c: Conference }) {
  const scores = useScores();
  const r = scores.get(c.id);
  return (
    <div className="flex items-center gap-3">
      {r && <ScoreRing score={r.score} tier={r.tier} size={40} animate={false} />}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
        <p className="truncate text-[12px] text-ink-muted">
          {c.series} · {fmtDateRange(c.startDate, c.endDate)}
        </p>
      </div>
    </div>
  );
}

function DrawerBody({ c }: { c: Conference }) {
  const navigate = useNavigate();
  const scores = useScores();
  const r = scores.get(c.id)!;
  const today = useToday();
  const homeBase = useSettings((s) => s.homeBase);
  const reps = useData((s) => s.reps);
  const conferences = useData((s) => s.conferences);
  const encounters = useData((s) => s.encounters);
  const contacts = useData((s) => s.contacts);
  const arcs = useArcs();
  const updateConference = useData((s) => s.updateConference);
  const toggleRep = useData((s) => s.toggleRep);

  const days = eventDays(c.startDate, c.endDate);
  const travel = estimateTravel(c, days, homeBase);
  const allIn = c.costs.ticketUsd + travel.totalUsd + (c.status === 'planned' && c.costs.boothUsd ? c.costs.boothUsd : 0);
  const until = daysUntil(c.startDate, today);
  const isPast = c.endDate < today;
  const host = r.piggybackOf ? conferences.find((x) => x.id === r.piggybackOf) : undefined;

  // People we've met at other editions of this series, plus leads captured here.
  const { knownHere, leadsHere } = useMemo(() => {
    const siblingIds = new Set(conferences.filter((x) => x.series === c.series && x.id !== c.id).map((x) => x.id));
    const leadsHere = encounters.filter((e) => e.conferenceId === c.id);
    const seen = new Set<string>();
    const knownHere = encounters
      .filter((e) => siblingIds.has(e.conferenceId))
      .map((e) => e.contactId)
      .filter((cid) => (seen.has(cid) ? false : (seen.add(cid), true)))
      .map((cid) => contacts.find((k) => k.id === cid))
      .filter((k): k is NonNullable<typeof k> => !!k)
      .sort((a, b) => (arcs.get(b.id)?.touches ?? 0) - (arcs.get(a.id)?.touches ?? 0));
    return { knownHere, leadsHere };
  }, [conferences, encounters, contacts, arcs, c.id, c.series]);

  const statusOptions: { value: ConferenceStatus; label: string }[] = isPast
    ? [
        { value: 'attended', label: 'Attended' },
        { value: 'skipped', label: 'Skipped' },
      ]
    : [
        { value: 'considering', label: 'Considering' },
        { value: 'planned', label: 'Planned' },
        { value: 'skipped', label: 'Skip' },
      ];

  return (
    <div>
      {/* Header block */}
      <div className="flex flex-wrap items-center gap-2">
        <TierBadge tier={r.tier} />
        <StatusBadge status={c.status} />
        {!c.datesConfirmed && <span className="rounded-md border border-line bg-bg px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-dim">dates estimated</span>}
        <span className="ml-auto text-[12px] text-ink-muted">{isPast ? `ended ${fmtRelativeDays(daysUntil(c.endDate, today))}` : `starts ${fmtRelativeDays(until)}`}</span>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{c.description}</p>
      <p className="mt-1.5 text-[12.5px] text-ink-dim">{TIER_BLURBS[r.tier]}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Segmented value={c.status} options={statusOptions} onChange={(status) => updateConference(c.id, { status })} />
        {c.url && (
          <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-[13px] text-ink-muted hover:border-line-strong hover:text-ink">
            <ExternalLink className="h-3.5 w-3.5" /> Website
          </a>
        )}
        {!isPast && (
          <Button variant="primary" icon={<Zap className="h-4 w-4" />} onClick={() => navigate(`/capture?conf=${c.id}`)}>
            Show floor mode
          </Button>
        )}
      </div>

      <Section title="Logistics">
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={<MapPin className="h-3 w-3" />} label="Where" value={c.city} sub={`${c.country} · ${c.countryCode}`} />
          <Stat icon={<Users className="h-3 w-3" />} label="Audience" value={fmtNumber(c.audienceSize)} sub={c.verticals.map((v) => VERTICAL_LABELS[v]).join(', ')} />
          <Stat
            icon={<Plane className="h-3 w-3" />}
            label={`From ${homeBase.label}`}
            value={`${fmtNumber(travel.distanceKm)} km`}
            sub={`${travel.bucket} · ${plural(travel.nights, 'night')} · ${plural(travel.travelDays, 'travel day')}`}
          />
          <Stat
            icon={<Ticket className="h-3 w-3" />}
            label="All-in estimate"
            value={fmtUsdCompact(allIn)}
            sub={`ticket ${fmtUsd(c.costs.ticketUsd)} · travel ${fmtUsd(travel.totalUsd)}${c.costs.boothUsd ? ` · booth ${fmtUsdCompact(c.costs.boothUsd)}` : ''}`}
          />
        </div>
      </Section>

      <Section title="Why this score" right={<span className="numeric font-mono text-[11px] text-ink-muted">{r.score} / 100</span>}>
        <ScoreBreakdown result={r} hostName={host?.name} />
      </Section>

      <Section title="ICP inputs (edit to re-score)">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg-elevated p-3">
          <Slider label="Vertical fit" hint="How much of the agenda is payments, treasury, FX and cross-border." value={c.icpInputs.verticalFit} min={0} max={10} step={1} onChange={(v) => updateConference(c.id, { icpInputs: { ...c.icpInputs, verticalFit: v } })} format={(v) => `${v}/10`} />
          <Slider label="Buyer density" hint="Share of attendees who are PSPs, cross-border payment companies, travel wholesalers or treasurers." value={c.icpInputs.buyerDensity} min={0} max={10} step={1} onChange={(v) => updateConference(c.id, { icpInputs: { ...c.icpInputs, buyerDensity: v } })} format={(v) => `${v}/10`} />
          <Slider label="Seniority" hint="Whether CFOs, treasurers and heads of payments actually show up." value={c.icpInputs.seniority} min={0} max={10} step={1} onChange={(v) => updateConference(c.id, { icpInputs: { ...c.icpInputs, seniority: v } })} format={(v) => `${v}/10`} />
        </div>
      </Section>

      <Section title="Who's going">
        <div className="flex flex-wrap gap-2">
          {reps.map((rep) => {
            const on = c.assignedRepIds.includes(rep.id);
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => toggleRep(c.id, rep.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12.5px] font-medium transition-all',
                  on ? 'border-line-strong bg-surface-2 text-ink' : 'border-line text-ink-dim hover:text-ink-muted',
                )}
                aria-pressed={on}
              >
                <Avatar name={rep.name} color={on ? rep.color : undefined} size={22} />
                {rep.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </Section>

      {c.history && c.history.length > 0 && (
        <Section title="Track record">
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-[12.5px]">
              <thead className="bg-bg-elevated text-left text-[10.5px] uppercase tracking-wider text-ink-dim">
                <tr>
                  <th className="px-3 py-2 font-medium">Year</th>
                  <th className="px-3 py-2 font-medium">Leads</th>
                  <th className="px-3 py-2 font-medium">Pipeline</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...c.history].sort((a, b) => b.year - a.year).map((h) => (
                  <tr key={h.year} className="border-t border-line">
                    <td className="numeric px-3 py-2 text-ink">{h.year}</td>
                    <td className="numeric px-3 py-2 text-ink">{h.leads}</td>
                    <td className="numeric px-3 py-2 text-ink">{fmtUsdCompact(h.pipelineUsd)}</td>
                    <td className="px-3 py-2 text-ink-muted">{h.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title={isPast ? 'People we met here' : 'People you know here'} right={<span className="text-[11px] text-ink-dim">{knownHere.length + (isPast ? 0 : 0)} from past {c.series} editions</span>}>
        {knownHere.length === 0 && leadsHere.length === 0 ? (
          <p className="text-[12.5px] text-ink-dim">No history with this series yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {(isPast ? leadsHere.map((e) => contacts.find((k) => k.id === e.contactId)).filter((k): k is NonNullable<typeof k> => !!k) : knownHere).slice(0, 8).map((k) => {
              const arc = arcs.get(k.id);
              const last = encounters.filter((e) => e.contactId === k.id).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
              return (
                <li key={k.id}>
                  <NavLink to={`/contacts/${k.id}`} className="flex items-center gap-2.5 rounded-lg border border-line bg-bg-elevated px-2.5 py-2 hover:border-line-strong">
                    <Avatar name={k.canonicalName} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                        {k.canonicalName} {last && <InterestDot interest={last.interest} />}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-muted">
                        {k.currentTitle ? `${k.currentTitle}, ` : ''}
                        {k.currentCompany}
                        {last ? ` · last seen ${fmtDate(last.capturedAt, false)}` : ''}
                      </span>
                    </span>
                    {arc && <ArcBadge arc={arc.classification} />}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {!isPast && leadsHere.length > 0 && (
        <Section title="Leads captured here">
          <p className="text-[12.5px] text-ink-muted">{plural(leadsHere.length, 'lead')} so far.</p>
        </Section>
      )}
    </div>
  );
}
