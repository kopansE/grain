import { motion } from 'motion/react';
import { CheckCircle2, Circle } from 'lucide-react';
import type { Encounter, Rep } from '@/domain/types';
import { Avatar } from '@/components/ui/Avatar';
import { INTEREST_COLOR } from '@/components/ui/Badge';
import { seniorityLevel, SENIORITY_LABELS } from '@/domain/matching/arc';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Vertical timeline of every meeting. The spine draws itself on mount and
 * each node fades in after it. Title changes and company changes are called
 * out inline, because those are the signals a rep actually cares about.
 */
export function ArcTimeline({
  encounters,
  reps,
  conferenceName,
  onToggleNextStep,
}: {
  encounters: Encounter[];
  reps: Rep[];
  conferenceName: (id: string) => string;
  onToggleNextStep: (encounterId: string, done: boolean) => void;
}) {
  const sorted = [...encounters].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  return (
    <div className="relative pl-7">
      <motion.div className="absolute bottom-3 left-[11px] top-3 w-0.5 origin-top rounded-full bg-gradient-to-b from-ink-dim/40 via-accent/70 to-accent" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
      <ol className="flex flex-col gap-4">
        {sorted.map((e, i) => {
          const prev = sorted[i - 1];
          const rep = reps.find((r) => r.id === e.repId);
          const titleChanged = prev && prev.title && e.title && prev.title !== e.title;
          const companyChanged = prev && prev.company !== e.company;
          const level = seniorityLevel(e.title);
          const prevLevel = seniorityLevel(prev?.title);
          const up = level !== undefined && prevLevel !== undefined && level > prevLevel;
          return (
            <motion.li key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="relative">
              <span className="absolute -left-7 top-1.5 flex h-6 w-6 items-center justify-center">
                <span className="h-3.5 w-3.5 rounded-full ring-4 ring-bg" style={{ background: INTEREST_COLOR[e.interest] }} />
              </span>
              <div className="rounded-xl border border-line bg-bg-elevated p-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-[14px] font-semibold text-ink">{conferenceName(e.conferenceId)}</p>
                  <p className="text-[12px] text-ink-dim">
                    {fmtDate(e.capturedAt)} {rep && <span className="text-ink-muted">· by {rep.name.split(' ')[0]}</span>}
                  </p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                  {e.title && (
                    <span className={cn('rounded-md border px-1.5 py-0.5', titleChanged ? (up ? 'border-teal/40 bg-teal-soft text-teal' : 'border-line bg-surface-2 text-ink') : 'border-line bg-surface-2 text-ink-muted')} title={level ? SENIORITY_LABELS[level] : undefined}>
                      {titleChanged ? `${up ? '↑ ' : ''}${e.title}` : e.title}
                    </span>
                  )}
                  <span className={cn('rounded-md border px-1.5 py-0.5', companyChanged ? 'border-teal/40 bg-teal-soft text-teal' : 'border-line bg-surface-2 text-ink-muted')}>{companyChanged ? `→ ${e.company}` : e.company}</span>
                  <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 capitalize text-ink-muted">{e.intent}</span>
                  <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 capitalize text-ink-muted" style={{ color: INTEREST_COLOR[e.interest] }}>
                    {e.interest}
                  </span>
                </div>
                {e.notes && <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">“{e.notes}”</p>}
                {e.painPoints.length > 0 && <p className="mt-1.5 text-[12px] text-ink-dim">Pain: {e.painPoints.join(', ')}</p>}
                {e.nextStep && (
                  <button type="button" onClick={() => onToggleNextStep(e.id, !e.nextStepDone)} className={cn('mt-2 flex items-center gap-1.5 text-[12.5px] font-medium', e.nextStepDone ? 'text-teal' : 'text-accent-bright hover:text-accent')}>
                    {e.nextStepDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {e.nextStep}
                    <span className="text-ink-dim">{e.nextStepDone ? '· done' : '· mark done'}</span>
                  </button>
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-dim">
                  <span className="capitalize">{e.source === 'seed' ? 'logged' : e.source}</span>
                  <span className={cn(e.hubspot?.status === 'synced' ? 'text-teal' : e.hubspot?.status === 'failed' ? 'text-rose' : '')}>
                    {e.hubspot?.status === 'synced' ? 'In HubSpot' : e.hubspot?.status === 'failed' ? 'HubSpot push failed' : 'Not in HubSpot'}
                  </span>
                </div>
                {rep && <Avatar name={rep.name} color={rep.color} size={22} className="absolute -right-1 -top-1" />}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
