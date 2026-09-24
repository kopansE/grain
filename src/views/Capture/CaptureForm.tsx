import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { INTEREST_COLOR } from '@/components/ui/Badge';
import type { Intent, Interest } from '@/domain/types';
import { NEXT_STEPS, PAIN_POINTS } from '@/data/seed/contacts';
import { cn } from '@/lib/cn';

export interface Draft {
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  interest: Interest;
  intent: Intent;
  painPoints: string[];
  nextStep: string;
  notes: string;
}

export const EMPTY_DRAFT: Draft = {
  name: '',
  company: '',
  title: '',
  email: '',
  phone: '',
  linkedin: '',
  interest: 'warm',
  intent: 'curious',
  painPoints: [],
  nextStep: '',
  notes: '',
};

const INTENTS: { value: Intent; label: string; hint: string }[] = [
  { value: 'curious', label: 'Curious', hint: 'Interested in principle' },
  { value: 'evaluating', label: 'Evaluating', hint: 'Comparing options' },
  { value: 'budget', label: 'Has budget', hint: 'Money and a timeline' },
  { value: 'champion', label: 'Champion', hint: 'Will sell it inside' },
];

const stagger = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.04 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } });

/** The form. Only the name is required. Every other field is one tap or optional. */
export function CaptureForm({ draft, onChange, highlight, children }: { draft: Draft; onChange: (patch: Partial<Draft>) => void; highlight?: (keyof Draft)[]; children?: React.ReactNode }) {
  const [more, setMore] = useState(!!(draft.email || draft.phone || draft.linkedin));
  const glow = (k: keyof Draft) => (highlight?.includes(k) ? 'ring-2 ring-accent/40 border-accent/60' : '');
  return (
    <div className="flex flex-col gap-4">
      <motion.div {...stagger(0)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Sarah Chen" autoComplete="off" className={cn('h-12 text-[16px]', glow('name'))} />
        </Field>
        <Field label="Company">
          <Input value={draft.company} onChange={(e) => onChange({ company: e.target.value })} placeholder="Adyen" autoComplete="off" className={cn('h-12 text-[16px]', glow('company'))} />
        </Field>
      </motion.div>

      {children}

      <motion.div {...stagger(1)}>
        <Field label="Title">
          <Input value={draft.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Head of Treasury" autoComplete="off" className={cn('h-12 text-[16px]', glow('title'))} />
        </Field>
      </motion.div>

      <motion.div {...stagger(2)}>
        <p className="mb-1.5 text-[12.5px] font-medium text-ink-muted">How warm?</p>
        <div className="grid grid-cols-3 gap-2">
          {(['hot', 'warm', 'cold'] as Interest[]).map((v) => {
            const on = draft.interest === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ interest: v })}
                aria-pressed={on}
                className={cn('flex h-12 items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold capitalize transition-all active:scale-[0.97]', on ? 'border-transparent text-bg' : 'border-line bg-bg-elevated text-ink-muted')}
                style={on ? { background: INTEREST_COLOR[v] } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: on ? 'rgba(11,13,18,0.5)' : INTEREST_COLOR[v] }} />
                {v}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div {...stagger(3)}>
        <p className="mb-1.5 text-[12.5px] font-medium text-ink-muted">Where are they?</p>
        <div className="grid grid-cols-2 gap-2">
          {INTENTS.map((o) => {
            const on = draft.intent === o.value;
            return (
              <button key={o.value} type="button" onClick={() => onChange({ intent: o.value })} aria-pressed={on} className={cn('flex h-12 flex-col items-start justify-center rounded-xl border px-3 text-left transition-all active:scale-[0.97]', on ? 'border-accent/60 bg-accent-soft' : 'border-line bg-bg-elevated')}>
                <span className={cn('text-[13.5px] font-semibold', on ? 'text-accent-bright' : 'text-ink')}>{o.label}</span>
                <span className="text-[11px] text-ink-dim">{o.hint}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div {...stagger(4)}>
        <p className="mb-1.5 text-[12.5px] font-medium text-ink-muted">Pain they mentioned</p>
        <div className="flex flex-wrap gap-2">
          {PAIN_POINTS.map((p) => (
            <Chip key={p} size="md" active={draft.painPoints.includes(p)} onClick={() => onChange({ painPoints: draft.painPoints.includes(p) ? draft.painPoints.filter((x) => x !== p) : [...draft.painPoints, p] })}>
              {p}
            </Chip>
          ))}
        </div>
      </motion.div>

      <motion.div {...stagger(5)}>
        <p className="mb-1.5 text-[12.5px] font-medium text-ink-muted">Next step</p>
        <div className="flex flex-wrap gap-2">
          {NEXT_STEPS.map((n) => (
            <Chip key={n} size="md" active={draft.nextStep === n} onClick={() => onChange({ nextStep: draft.nextStep === n ? '' : n })}>
              {n}
            </Chip>
          ))}
        </div>
        {draft.nextStep && !NEXT_STEPS.includes(draft.nextStep) && <p className="mt-1.5 text-[12px] text-ink-muted">Custom: {draft.nextStep}</p>}
      </motion.div>

      <motion.div {...stagger(6)}>
        <Field label="Notes">
          <Textarea value={draft.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="What they said, in their words." className="text-[16px]" />
        </Field>
      </motion.div>

      <motion.div {...stagger(7)}>
        <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted hover:text-ink">
          <ChevronDown className={cn('h-4 w-4 transition-transform', more && 'rotate-180')} /> Email, phone, LinkedIn
        </button>
        {more && (
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Input type="email" inputMode="email" value={draft.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="Email" autoComplete="off" className={cn('h-12 text-[16px]', glow('email'))} />
            <Input type="tel" inputMode="tel" value={draft.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="Phone" autoComplete="off" className="h-12 text-[16px]" />
            <Input value={draft.linkedin} onChange={(e) => onChange({ linkedin: e.target.value })} placeholder="LinkedIn URL" autoComplete="off" className="h-12 text-[16px]" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
