import { AnimatePresence, motion } from 'motion/react';
import { Check, Link2, Sparkles, Undo2, UserRoundSearch, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ArcBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { MatchCandidate } from '@/domain/matching/match';
import type { ArcAssessment, Contact } from '@/domain/types';
import { NUDGE_GOAL } from '@/domain/matching/arc';
import { cn } from '@/lib/cn';

export type LinkState = { contactId: string; mode: 'auto' | 'confirmed' } | null;

export interface MatchCardProps {
  candidate?: MatchCandidate;
  link: LinkState;
  linkedContact?: Contact;
  arc?: ArcAssessment;
  onConfirm: (contactId: string) => void;
  onReject: (contactId: string) => void;
  onUndo: () => void;
  aiSummary?: { summary: string; nudge: string; demo: boolean };
  aiLoading?: boolean;
}

/**
 * The moment that matters: the rep is standing in front of the person.
 * Auto-linked matches show a green confirmation with Undo. Uncertain matches
 * ask one question with two big buttons.
 */
export function MatchCard({ candidate, link, linkedContact, arc, onConfirm, onReject, onUndo, aiSummary, aiLoading }: MatchCardProps) {
  const showAsk = !link && candidate;
  const showLinked = link && linkedContact;
  return (
    <AnimatePresence mode="wait">
      {showAsk && candidate && (
        <motion.div
          key={'ask-' + candidate.contact.id}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="rounded-2xl border border-accent/40 bg-accent-soft p-4 shadow-glow-accent"
        >
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-accent-bright">
            <UserRoundSearch className="h-4 w-4" /> Same person?
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={candidate.contact.canonicalName} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">{candidate.contact.canonicalName}</p>
              <p className="truncate text-[12.5px] text-ink-muted">
                {candidate.contact.currentTitle ? `${candidate.contact.currentTitle}, ` : ''}
                {candidate.contact.currentCompany}
              </p>
            </div>
            <span className="numeric rounded-full bg-bg/40 px-2 py-0.5 font-mono text-[11px] text-accent-bright">{Math.round(candidate.confidence * 100)}%</span>
          </div>
          <ul className="mt-2 flex flex-col gap-0.5 text-[12.5px] text-ink-muted">
            {candidate.reasons.map((r) => (
              <li key={r}>· {r}</li>
            ))}
            {arc && <li>· {arc.signals[0]}</li>}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="lg" variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => onConfirm(candidate.contact.id)}>
              Yes, same person
            </Button>
            <Button size="lg" icon={<X className="h-4 w-4" />} onClick={() => onReject(candidate.contact.id)}>
              No, someone new
            </Button>
          </div>
        </motion.div>
      )}

      {showLinked && linkedContact && (
        <motion.div
          key={'linked-' + linkedContact.id}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className={cn('rounded-2xl border p-4', arc?.classification === 'tire-kicker' ? 'border-rose/40 bg-rose/[0.07]' : 'border-teal/40 bg-teal-soft shadow-glow-teal')}
        >
          <div className="flex items-center justify-between gap-2">
            <p className={cn('flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider', arc?.classification === 'tire-kicker' ? 'text-rose' : 'text-teal')}>
              <Link2 className="h-4 w-4" /> {link.mode === 'auto' ? 'Linked automatically' : 'Linked'} · met {arc?.touches ?? 0}× before
            </p>
            <button type="button" onClick={onUndo} className="flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink">
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={linkedContact.canonicalName} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">{linkedContact.canonicalName}</p>
              <p className="truncate text-[12.5px] text-ink-muted">
                {linkedContact.currentTitle ? `${linkedContact.currentTitle}, ` : ''}
                {linkedContact.currentCompany}
              </p>
            </div>
            {arc && <ArcBadge arc={arc.classification} />}
          </div>
          {arc && (
            <ul className="mt-2.5 flex flex-col gap-0.5 text-[12.5px] text-ink-muted">
              {arc.signals.slice(0, 4).map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 rounded-xl border border-line bg-bg/60 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-dim">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> What to do right now{aiSummary?.demo ? ' · demo' : ''}
            </p>
            {aiLoading ? (
              <div className="mt-2 space-y-1.5">
                <div className="h-3 w-5/6 animate-pulse rounded bg-surface-3" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-3" />
              </div>
            ) : aiSummary ? (
              <>
                <p className="mt-1.5 text-[13px] leading-snug text-ink">{aiSummary.summary}</p>
                <p className="mt-1.5 text-[13px] font-medium leading-snug text-accent-bright">{aiSummary.nudge}</p>
              </>
            ) : (
              <p className="mt-1.5 text-[13px] leading-snug text-ink">{arc ? NUDGE_GOAL[arc.classification] : ''}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
