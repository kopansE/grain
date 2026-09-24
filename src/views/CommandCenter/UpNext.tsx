import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { CalendarDays, MapPin, QrCode, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar, RepAvatars } from '@/components/ui/Avatar';
import { Badge, CountryTag, TierBadge } from '@/components/ui/Badge';
import { useData } from '@/store/data';
import { useArcs, useScores, useToday, useUpcoming } from '@/store/selectors';
import { daysUntil, fmtDateRange, fmtRelativeDays, plural } from '@/lib/format';

export function UpNext() {
  const upcoming = useUpcoming();
  const today = useToday();
  const scores = useScores();
  const reps = useData((s) => s.reps);
  const conferences = useData((s) => s.conferences);
  const encounters = useData((s) => s.encounters);
  const contacts = useData((s) => s.contacts);
  const arcs = useArcs();
  const navigate = useNavigate();
  const [qr, setQr] = useState(false);

  const next = useMemo(() => upcoming.find((c) => c.status === 'planned' && c.endDate >= today), [upcoming, today]);

  const known = useMemo(() => {
    if (!next) return [];
    const siblings = new Set(conferences.filter((x) => x.series === next.series && x.id !== next.id).map((x) => x.id));
    const ids = [...new Set(encounters.filter((e) => siblings.has(e.conferenceId)).map((e) => e.contactId))];
    return ids
      .map((id) => contacts.find((k) => k.id === id))
      .filter((k): k is NonNullable<typeof k> => !!k)
      .sort((a, b) => (arcs.get(b.id)?.touches ?? 0) - (arcs.get(a.id)?.touches ?? 0));
  }, [next, conferences, encounters, contacts, arcs]);

  if (!next) {
    return (
      <div className="card p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Up next</p>
        <p className="mt-2 text-ink-muted">Nothing planned yet. Mark an event as Planned in Explore.</p>
      </div>
    );
  }

  const r = scores.get(next.id)!;
  const live = next.startDate <= today && next.endDate >= today;
  const until = daysUntil(next.startDate, today);
  const going = next.assignedRepIds.map((id) => reps.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const warmingKnown = known.filter((k) => ['warming', 'job-change'].includes(arcs.get(k.id)?.classification ?? ''));

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Up next</p>
        {live ? (
          <Badge tone="rose">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose" /> Live now
          </Badge>
        ) : (
          <span className="text-[12px] text-ink-muted">{fmtRelativeDays(until)}</span>
        )}
      </div>

      <NavLink to={`/conferences/${next.id}`} className="mt-2 block">
        <p className="display text-[26px] leading-tight text-ink hover:text-accent-bright">{next.name}</p>
      </NavLink>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-muted">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> {fmtDateRange(next.startDate, next.endDate)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> <CountryTag code={next.countryCode} /> {next.city}
        </span>
        <TierBadge tier={r.tier} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-bg-elevated p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-dim">Going</p>
          <div className="mt-2 flex items-center gap-2">
            {going.length ? <RepAvatars reps={going} size={26} /> : <span className="text-[12.5px] text-rose">Nobody yet</span>}
            {going.length > 0 && <span className="text-[12.5px] text-ink-muted">{going.map((g) => g.name.split(' ')[0]).join(', ')}</span>}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg-elevated p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-dim">People you know there</p>
          <div className="mt-2 flex items-center gap-2">
            {known.length ? (
              <>
                <span className="flex">
                  {known.slice(0, 4).map((k, i) => (
                    <Avatar key={k.id} name={k.canonicalName} size={26} className={i > 0 ? '-ml-2' : ''} />
                  ))}
                </span>
                <span className="text-[12.5px] text-ink-muted">
                  {known.length} met at past {next.series}
                  {warmingKnown.length > 0 && <span className="text-accent-bright"> · {warmingKnown.length} warming</span>}
                </span>
              </>
            ) : (
              <span className="text-[12.5px] text-ink-dim">First time at this series</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" icon={<Zap className="h-4 w-4" />} onClick={() => navigate(`/capture?conf=${next.id}`)}>
          Show floor mode
        </Button>
        <Button icon={<QrCode className="h-4 w-4" />} onClick={() => setQr(true)} title="Open show-floor mode on your phone">
          Phone
        </Button>
        <Button variant="ghost" onClick={() => navigate(`/conferences/${next.id}`)}>
          Details
        </Button>
      </div>

      <QrModal open={qr} onClose={() => setQr(false)} path={`/capture?conf=${next.id}`} title={next.name} />
      {known.length > 0 && <p className="mt-3 text-[11.5px] text-ink-dim">{plural(known.length, 'contact')} from past editions will be flagged the moment you type their name on the floor.</p>}
    </div>
  );
}

export function QrModal({ open, onClose, path, title }: { open: boolean; onClose: () => void; path: string; title: string }) {
  const [src, setSrc] = useState<string>();
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    import('qrcode').then((qr) =>
      qr.toDataURL(url, { margin: 1, width: 280, color: { dark: '#0b0d12', light: '#f6f1e6' } }).then((d) => alive && setSrc(d)),
    );
    return () => {
      alive = false;
    };
  }, [open, url]);
  return (
    <Modal open={open} onClose={onClose} title={<p className="font-semibold text-ink">Open on your phone</p>}>
      <p className="text-[13px] text-ink-muted">Scan to open show-floor mode for {title}. Add it to your home screen for one-tap capture.</p>
      <div className="mt-4 flex justify-center">
        {src ? <img src={src} alt="QR code" className="h-[220px] w-[220px] rounded-xl" /> : <div className="h-[220px] w-[220px] animate-pulse rounded-xl bg-surface-3" />}
      </div>
      <p className="mt-3 break-all text-center font-mono text-[11px] text-ink-dim">{url}</p>
    </Modal>
  );
}
