import { useMemo } from 'react';
import { NavLink } from 'react-router';
import { Radar } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar } from '@/components/ui/Avatar';
import { ArcBadge } from '@/components/ui/Badge';
import type { ArcAssessment, ArcClass, Contact } from '@/domain/types';
import { useData } from '@/store/data';
import { useArcs } from '@/store/selectors';

const PRIORITY: Record<ArcClass, number> = { warming: 0, 'job-change': 1, 'tire-kicker': 2, new: 3, stalled: 4 };
const ACTION: Record<ArcClass, string> = {
  warming: 'Close it',
  'job-change': 'Re-open',
  'tire-kicker': 'Qualify or park',
  new: 'Follow up',
  stalled: 'Re-engage',
};

const QUOTA: Partial<Record<ArcClass, number>> = { warming: 3, 'job-change': 1, 'tire-kicker': 1, new: 1 };

/**
 * At most five nudges, with a quota per class so one loud category cannot
 * crowd out a job change or a tire-kicker with an open next step. Nothing
 * else surfaces here on purpose: nudges live where the rep already is.
 */
export function pickRadar(contacts: Contact[], arcs: Map<string, ArcAssessment>, limit = 5): { contact: Contact; arc: ArcAssessment }[] {
  const eligible = contacts
    .map((contact) => ({ contact, arc: arcs.get(contact.id) }))
    .filter((x): x is { contact: Contact; arc: ArcAssessment } => !!x.arc)
    .filter(({ arc }) => {
      if (arc.classification === 'warming' || arc.classification === 'job-change') return true;
      if (arc.classification === 'tire-kicker') return arc.nextStepsAgreed > arc.nextStepsDone;
      if (arc.classification === 'new') return arc.nextStepsAgreed > arc.nextStepsDone && arc.signals.includes('Last meeting: hot');
      return false;
    })
    .sort((a, b) => PRIORITY[a.arc.classification] - PRIORITY[b.arc.classification] || b.arc.touches - a.arc.touches || b.arc.lastSeen.localeCompare(a.arc.lastSeen));

  const used: Partial<Record<ArcClass, number>> = {};
  const picked: typeof eligible = [];
  for (const item of eligible) {
    const k = item.arc.classification;
    if ((used[k] ?? 0) >= (QUOTA[k] ?? 0)) continue;
    used[k] = (used[k] ?? 0) + 1;
    picked.push(item);
    if (picked.length === limit) break;
  }
  // Fill any remaining slots in priority order.
  for (const item of eligible) {
    if (picked.length === limit) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.sort((a, b) => PRIORITY[a.arc.classification] - PRIORITY[b.arc.classification]);
}

export function RelationshipRadar() {
  const contacts = useData((s) => s.contacts);
  const arcs = useArcs();
  const items = useMemo(() => pickRadar(contacts, arcs), [contacts, arcs]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
          <Radar className="h-3.5 w-3.5" /> Relationship radar
        </p>
        <NavLink to="/contacts" className="text-[12px] text-ink-muted hover:text-ink">
          All people
        </NavLink>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-muted">Nothing to nudge. Capture a few leads and the radar fills itself.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map(({ contact, arc }, i) => (
            <motion.li key={contact.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <NavLink to={`/contacts/${contact.id}`} className="group flex items-center gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-surface-2">
                <Avatar name={contact.canonicalName} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{contact.canonicalName}</span>
                    <span className="truncate text-[12px] text-ink-dim">{contact.currentCompany}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-muted">{arc.signals.find((s) => !s.startsWith('Met once')) ?? arc.signals[0]}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <ArcBadge arc={arc.classification} />
                  <span className="text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">{ACTION[arc.classification]} →</span>
                </span>
              </NavLink>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
