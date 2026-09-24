import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/components/ui/Toast';
import type { Conference } from '@/domain/types';
import { ARC_LABELS, VERTICAL_LABELS } from '@/domain/types';
import { NUDGE_GOAL } from '@/domain/matching/arc';
import { useData } from '@/store/data';
import { useArcs } from '@/store/selectors';
import { callAi, type PreBrief } from '@/lib/ai';
import { fmtDate, fmtDateRange } from '@/lib/format';

export function PreBriefSheet({ open, onClose, conference }: { open: boolean; onClose: () => void; conference: Conference }) {
  const conferences = useData((s) => s.conferences);
  const contacts = useData((s) => s.contacts);
  const encounters = useData((s) => s.encounters);
  const reps = useData((s) => s.reps);
  const arcs = useArcs();
  const [brief, setBrief] = useState<PreBrief>();
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const doneFor = useRef<string | undefined>(undefined);

  const known = useMemo(() => {
    const siblings = new Set(conferences.filter((x) => x.series === conference.series && x.id !== conference.id).map((x) => x.id));
    const byContact = new Map<string, typeof encounters>();
    for (const e of encounters) if (siblings.has(e.conferenceId)) byContact.set(e.contactId, [...(byContact.get(e.contactId) ?? []), e]);
    return [...byContact.entries()]
      .map(([cid, list]) => {
        const c = contacts.find((k) => k.id === cid);
        const arc = arcs.get(cid);
        const last = [...list].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]!;
        return c && arc ? { c, arc, last } : undefined;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.arc.touches - a.arc.touches);
  }, [conferences, contacts, encounters, arcs, conference.id, conference.series]);

  const recentPains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of encounters) for (const p of e.painPoints) counts.set(p, (counts.get(p) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p);
  }, [encounters]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await callAi<PreBrief>(
        'preBrief',
        {
          conference: { name: conference.name, city: conference.city, dates: fmtDateRange(conference.startDate, conference.endDate), description: conference.description, verticals: conference.verticals, audienceSize: conference.audienceSize },
          known: known.slice(0, 8).map(({ c, arc, last }) => ({ name: c.canonicalName, company: c.currentCompany, title: c.currentTitle, classification: arc.classification, lastMet: fmtDate(last.capturedAt), nextStep: last.nextStep && !last.nextStepDone ? last.nextStep : undefined, notes: last.notes.slice(0, 160) })),
          recentPains,
          reps: conference.assignedRepIds.map((id) => reps.find((r) => r.id === id)?.name.split(' ')[0] ?? id),
          today: new Date().toISOString().slice(0, 10),
        },
        () => demoBrief(),
      );
      setBrief(res.data);
      setDemo(res.demo);
    } catch (e) {
      toast.error('Could not write the brief', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  const demoBrief = (): PreBrief => ({
    headline: `${conference.name}: ${conference.description.split('.')[0]}.`,
    whoToMeet: known.slice(0, 5).map(({ c, arc }) => ({ name: c.canonicalName, company: c.currentCompany, why: `${ARC_LABELS[arc.classification]}: ${arc.signals[0] ?? ''}`, opener: NUDGE_GOAL[arc.classification] })),
    targets: [...conference.verticals.map((v) => `${VERTICAL_LABELS[v]} companies with multi-currency flows`), 'Treasurers and heads of payments', 'Product leaders who own pricing'].slice(0, 5),
    talkingPoints: ['Guaranteed local-currency pricing without carrying the FX risk.', 'Hedging that runs from the API, not from a spreadsheet.', 'Cross-border payouts at a known cost, in any currency you settle.'],
    checklist: ['Pre-book meetings with the people below two weeks out.', 'Bring the one-pager that matches this audience.', 'Open show-floor mode on your phone before the doors open.', 'Push leads to HubSpot every evening.', 'Log the leads-per-day so next year’s score learns.'],
  });

  useEffect(() => {
    if (!open || doneFor.current === conference.id) return;
    doneFor.current = conference.id;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conference.id]);

  const copy = async () => {
    if (!brief) return;
    const text = [
      `${conference.name} — prep brief`,
      brief.headline,
      '',
      'Who to meet:',
      ...brief.whoToMeet.map((w) => `- ${w.name}, ${w.company}: ${w.why} Opener: "${w.opener}"`),
      '',
      'Targets on the floor:',
      ...brief.targets.map((t) => `- ${t}`),
      '',
      'Talking points:',
      ...brief.talkingPoints.map((t) => `- ${t}`),
      '',
      'Checklist:',
      ...brief.checklist.map((t) => `- ${t}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Brief copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-accent" /> Prep brief · {conference.series}
          </p>
          <p className="text-[12px] text-ink-muted">{demo ? 'Demo brief from your data. Add a key in Settings for a written one.' : 'Written from your notes and the event.'}</p>
        </div>
      }
    >
      {loading || !brief ? (
        <div className="space-y-3 py-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-surface-3" />
          <div className="h-24 animate-pulse rounded-xl bg-surface-3" />
          <div className="h-24 animate-pulse rounded-xl bg-surface-3" />
          <p className="text-[12px] text-ink-dim">Reading {known.length} known contact{known.length === 1 ? '' : 's'} and the event…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="display text-[22px] leading-snug text-ink">{brief.headline}</p>

          <section>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Who to meet</p>
            {brief.whoToMeet.length === 0 ? (
              <p className="text-[13px] text-ink-muted">Nobody known yet. This is a first-time room.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {brief.whoToMeet.map((w) => {
                  const c = contacts.find((k) => k.canonicalName === w.name);
                  return (
                    <li key={w.name} className="rounded-xl border border-line bg-bg-elevated p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={w.name} size={28} />
                        <div className="min-w-0 flex-1">
                          {c ? (
                            <NavLink to={`/contacts/${c.id}`} className="text-[13.5px] font-semibold text-ink hover:text-accent-bright">
                              {w.name}
                            </NavLink>
                          ) : (
                            <p className="text-[13.5px] font-semibold text-ink">{w.name}</p>
                          )}
                          <p className="text-[12px] text-ink-muted">{w.company}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[13px] leading-snug text-ink">{w.why}</p>
                      <p className="mt-1 text-[12.5px] italic text-ink-muted">“{w.opener}”</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Hunt for</p>
            <ul className="flex flex-wrap gap-1.5">
              {brief.targets.map((t) => (
                <li key={t} className="rounded-full border border-line bg-bg-elevated px-2.5 py-1 text-[12.5px] text-ink">
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Talking points</p>
            <ol className="flex flex-col gap-1.5 text-[13.5px] leading-snug text-ink">
              {brief.talkingPoints.map((t, i) => (
                <li key={t} className="flex gap-2">
                  <span className="text-accent">{i + 1}.</span> {t}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Checklist</p>
            <ul className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
              {brief.checklist.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded border border-line-strong" /> {t}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex gap-2">
            <Button icon={<Copy className="h-4 w-4" />} onClick={copy}>
              Copy brief
            </Button>
            <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={generate}>
              Rewrite
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
