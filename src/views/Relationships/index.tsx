import { useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ArcBadge, ARC_COLOR, InterestDot } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { ARC_LABELS, type ArcClass, type Contact } from '@/domain/types';
import { useData } from '@/store/data';
import { useArcs, useConferenceNameLookup, useContact } from '@/store/selectors';
import { daysUntil, fmtRelativeDays } from '@/lib/format';
import { useIsDesktop } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { ContactArc } from './ContactArc';

const ARC_ORDER: ArcClass[] = ['warming', 'job-change', 'new', 'stalled', 'tire-kicker'];
type SortKey = 'recent' | 'touches' | 'name';

export default function Relationships() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const desktop = useIsDesktop();
  const contacts = useData((s) => s.contacts);
  const encounters = useData((s) => s.encounters);
  const arcs = useArcs();
  const nameOf = useConferenceNameLookup();
  const selected = useContact(id);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const arcFilter = (params.get('arc') as ArcClass | null) ?? null;
  const syncFilter = params.get('sync');
  const today = new Date().toISOString().slice(0, 10);

  const setArcFilter = (a: ArcClass | null) => {
    const next = new URLSearchParams(params);
    if (a) next.set('arc', a);
    else next.delete('arc');
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const out: Record<ArcClass, number> = { new: 0, warming: 0, stalled: 0, 'tire-kicker': 0, 'job-change': 0 };
    for (const a of arcs.values()) out[a.classification]++;
    return out;
  }, [arcs]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const lastByContact = new Map<string, { capturedAt: string; interest: 'hot' | 'warm' | 'cold'; conferenceId: string }>();
    for (const e of encounters) {
      const cur = lastByContact.get(e.contactId);
      if (!cur || e.capturedAt > cur.capturedAt) lastByContact.set(e.contactId, { capturedAt: e.capturedAt, interest: e.interest, conferenceId: e.conferenceId });
    }
    const unsyncedByContact = new Map<string, number>();
    for (const e of encounters) if (e.hubspot?.status !== 'synced') unsyncedByContact.set(e.contactId, (unsyncedByContact.get(e.contactId) ?? 0) + 1);

    return contacts
      .filter((c) => c.encounterIds.length > 0)
      .map((c) => ({ c, arc: arcs.get(c.id), last: lastByContact.get(c.id), unsynced: unsyncedByContact.get(c.id) ?? 0 }))
      .filter((x) => !arcFilter || x.arc?.classification === arcFilter)
      .filter((x) => syncFilter !== 'unsynced' || x.unsynced > 0)
      .filter((x) => !s || `${x.c.canonicalName} ${x.c.currentCompany} ${x.c.currentTitle ?? ''} ${x.c.aliases.join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => {
        if (sort === 'name') return a.c.canonicalName.localeCompare(b.c.canonicalName);
        if (sort === 'touches') return (b.arc?.touches ?? 0) - (a.arc?.touches ?? 0);
        return (b.last?.capturedAt ?? '').localeCompare(a.last?.capturedAt ?? '');
      });
  }, [contacts, encounters, arcs, q, sort, arcFilter, syncFilter]);

  const showDetail = !!selected;
  const showList = desktop || !showDetail;

  const withParam = (contact: Contact, key: string) => {
    const next = new URLSearchParams(params);
    next.set(key, '1');
    return `/contacts/${contact.id}?${next}`;
  };
  const openDraft = (contact: Contact) => navigate(withParam(contact, 'draft'));
  const openPush = (contact: Contact) => navigate(withParam(contact, 'push'));

  return (
    <div className={cn('grid gap-6', desktop && showDetail ? 'lg:grid-cols-[360px_minmax(0,1fr)]' : '')}>
      {showList && (
        <section className={cn('min-w-0', desktop && showDetail && 'lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1')}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="display text-[28px] leading-none text-ink">
              {rows.length} <span className="text-ink-muted">{rows.length === 1 ? 'person' : 'people'}</span>
            </h2>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 w-auto pr-8 text-[12.5px]">
              <option value="recent">Recently met</option>
              <option value="touches">Most meetings</option>
              <option value="name">A to Z</option>
            </Select>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company, title…" className="h-10 w-full rounded-xl border border-line bg-bg-elevated pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-dim focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Chip active={!arcFilter && syncFilter !== 'unsynced'} onClick={() => { setArcFilter(null); const n = new URLSearchParams(params); n.delete('sync'); setParams(n, { replace: true }); }}>
              All
            </Chip>
            {ARC_ORDER.map((a) => (
              <Chip key={a} active={arcFilter === a} onClick={() => setArcFilter(arcFilter === a ? null : a)} color={ARC_COLOR[a]} count={counts[a]}>
                {ARC_LABELS[a]}
              </Chip>
            ))}
            <Chip active={syncFilter === 'unsynced'} onClick={() => { const n = new URLSearchParams(params); if (syncFilter === 'unsynced') n.delete('sync'); else n.set('sync', 'unsynced'); setParams(n, { replace: true }); }}>
              Not in HubSpot
            </Chip>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="Nobody here yet" body="Capture a lead in show-floor mode and they'll show up with a relationship read." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {rows.map(({ c, arc, last, unsynced }, i) => (
                  <motion.li key={c.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }}>
                    <NavLink
                      to={`/contacts/${c.id}${params.toString() ? `?${params}` : ''}`}
                      className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors', selected?.id === c.id ? 'border-accent/50 bg-accent-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2')}
                    >
                      <Avatar name={c.canonicalName} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-semibold text-ink">{c.canonicalName}</span>
                          {last && <InterestDot interest={last.interest} />}
                        </span>
                        <span className="block truncate text-[12px] text-ink-muted">
                          {c.currentTitle ? `${c.currentTitle}, ` : ''}
                          {c.currentCompany}
                        </span>
                        <span className="block truncate text-[11px] text-ink-dim">
                          {arc ? `${arc.touches}× · ` : ''}
                          {last ? `${nameOf(last.conferenceId)} · ${fmtRelativeDays(daysUntil(last.capturedAt.slice(0, 10), today))}` : ''}
                          {unsynced > 0 && <span className="text-indigo"> · {unsynced} not in HubSpot</span>}
                        </span>
                      </span>
                      {arc && <ArcBadge arc={arc.classification} />}
                    </NavLink>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      )}

      {showDetail && selected && (
        <section className="min-w-0">
          <ContactArc contact={selected} arc={arcs.get(selected.id)} onDraft={() => openDraft(selected)} onPush={() => openPush(selected)} showBack={!desktop} />
        </section>
      )}
      {desktop && !showDetail && null}
    </div>
  );
}
