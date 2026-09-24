import { NavLink } from 'react-router';
import { AlertTriangle, CloudOff, UserX } from 'lucide-react';
import { useData } from '@/store/data';
import { usePlanningInsights } from '@/store/selectors';
import { fmtDate } from '@/lib/format';

export function NeedsAttention() {
  const { collisions, unassigned } = usePlanningInsights();
  const reps = useData((s) => s.reps);
  const unsynced = useData((s) => s.encounters.filter((e) => e.hubspot?.status !== 'synced').length);
  const items: { key: string; icon: React.ReactNode; text: React.ReactNode; to: string }[] = [];

  for (const k of collisions.filter((x) => x.sharedRepIds.length > 0 || (x.a.status === 'planned' && x.b.status === 'planned')).slice(0, 2)) {
    const shared = k.sharedRepIds.map((id) => reps.find((r) => r.id === id)?.name.split(' ')[0]).filter(Boolean);
    items.push({
      key: `col-${k.a.id}-${k.b.id}`,
      icon: <AlertTriangle className="h-4 w-4 text-rose" />,
      text: (
        <>
          <b className="font-semibold text-ink">{k.a.name}</b> and <b className="font-semibold text-ink">{k.b.name}</b> collide the same week
          {shared.length ? <span className="text-rose">, {shared.join(' and ')} on both</span> : ''}.
        </>
      ),
      to: '/plan',
    });
  }
  for (const c of unassigned.slice(0, 3)) {
    items.push({
      key: `un-${c.id}`,
      icon: <UserX className="h-4 w-4 text-accent" />,
      text: (
        <>
          Anchor event <b className="font-semibold text-ink">{c.name}</b> ({fmtDate(c.startDate)}) has nobody assigned.
        </>
      ),
      to: `/conferences/${c.id}`,
    });
  }
  if (unsynced > 0) {
    items.push({
      key: 'unsynced',
      icon: <CloudOff className="h-4 w-4 text-indigo" />,
      text: (
        <>
          <b className="font-semibold text-ink">{unsynced} leads</b> are not in HubSpot yet.
        </>
      ),
      to: '/contacts?sync=unsynced',
    });
  }

  return (
    <div className="card p-5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Needs a decision</p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-muted">All clear.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.key}>
              <NavLink to={it.to} className="flex items-start gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-[12.5px] leading-snug text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-2">
                <span className="mt-0.5 shrink-0">{it.icon}</span>
                <span>{it.text}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
