import { useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ExternalLink, GitMerge, Mail, RefreshCw, Sparkles, Undo2, Upload } from 'lucide-react';
import { useArcAi } from '@/lib/useArcAi';
import { FollowUpSheet } from './FollowUpSheet';
import { Avatar } from '@/components/ui/Avatar';
import { ArcBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { ArcAssessment, Contact } from '@/domain/types';
import { NUDGE_GOAL } from '@/domain/matching/arc';
import { useData } from '@/store/data';
import { useConferenceNameLookup, useEncountersFor } from '@/store/selectors';
import { fmtDate, plural } from '@/lib/format';
import { ArcTimeline } from './ArcTimeline';
import { MergeSheet } from './MergeSheet';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-elevated px-3 py-2.5">
      <p className="text-[10.5px] uppercase tracking-wider text-ink-dim">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold text-ink">{value}</p>
      {sub && <p className="text-[11.5px] text-ink-muted">{sub}</p>}
    </div>
  );
}

export function ContactArc({
  contact,
  arc,
  onDraft,
  onPush,
  showBack,
}: {
  contact: Contact;
  arc?: ArcAssessment;
  onDraft: () => void;
  onPush: () => void;
  showBack?: boolean;
}) {
  const navigate = useNavigate();
  const encounters = useEncountersFor(contact.id);
  const reps = useData((s) => s.reps);
  const nameOf = useConferenceNameLookup();
  const setNextStepDone = useData((s) => s.setNextStepDone);
  const mergeContacts = useData((s) => s.mergeContacts);
  const unmergeContact = useData((s) => s.unmergeContact);
  const contacts = useData((s) => s.contacts);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const draftOpen = params.has('draft');
  const closeDraft = () => {
    const next = new URLSearchParams(params);
    next.delete('draft');
    setParams(next, { replace: true });
  };
  const { ai, loading: aiLoading, error: aiError, regenerate } = useArcAi(contact, arc);

  const first = encounters[0];
  const last = encounters[encounters.length - 1];
  const unsynced = encounters.filter((e) => e.hubspot?.status !== 'synced').length;
  const mergedFrom = (contact.mergedFrom ?? []).map((id) => contacts.find((c) => c.id === id)).filter((c): c is Contact => !!c);

  return (
    <div className="flex flex-col gap-5">
      {showBack && (
        <NavLink to="/contacts" className="flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All people
        </NavLink>
      )}

      <header className="flex flex-wrap items-start gap-4">
        <Avatar name={contact.canonicalName} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="display text-[30px] leading-none text-ink">{contact.canonicalName}</h2>
            {arc && <ArcBadge arc={arc.classification} />}
            {arc && <span className="numeric font-mono text-[11px] text-ink-dim">{Math.round(arc.confidence * 100)}% sure</span>}
          </div>
          <p className="mt-1.5 text-[14px] text-ink-muted">
            {contact.currentTitle ? `${contact.currentTitle}, ` : ''}
            <span className="text-ink">{contact.currentCompany}</span>
            {arc?.companyChanged && first && <span className="text-ink-dim"> · previously {first.company}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-dim">
            {contact.emails[0] && <a href={`mailto:${contact.emails[0]}`} className="hover:text-ink">{contact.emails[0]}</a>}
            {contact.phones[0] && <span>{contact.phones[0]}</span>}
            {contact.linkedin && (
              <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://www.linkedin.com/in/${contact.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {contact.aliases.length > 1 && <span title={contact.aliases.join(', ')}>also logged as {contact.aliases.filter((a) => a !== contact.canonicalName).join(', ')}</span>}
            {contact.hubspotContactId && <Badge tone="teal">HubSpot #{contact.hubspotContactId}</Badge>}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<Mail className="h-4 w-4" />} onClick={onDraft}>
          Draft follow-up
        </Button>
        <Button icon={<Upload className="h-4 w-4" />} onClick={onPush}>
          {unsynced > 0 ? `Push ${plural(unsynced, 'meeting')} to HubSpot` : 'In HubSpot'}
        </Button>
        <Button variant="ghost" icon={<GitMerge className="h-4 w-4" />} onClick={() => setMergeOpen(true)}>
          Merge into…
        </Button>
        {mergedFrom.length > 0 && (
          <Button
            variant="ghost"
            icon={<Undo2 className="h-4 w-4" />}
            onClick={() => {
              unmergeContact(contact.id);
              toast.success('Unmerged', `${mergedFrom[mergedFrom.length - 1]!.canonicalName} is a separate person again.`);
            }}
          >
            Unmerge {mergedFrom[mergedFrom.length - 1]!.canonicalName.split(' ')[0]}
          </Button>
        )}
      </div>

      {arc && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Meetings" value={String(arc.touches)} sub={arc.spanMonths >= 1 ? `over ${Math.round(arc.spanMonths)} months` : 'so far'} />
          <Stat label="Last seen" value={last ? fmtDate(last.capturedAt, false) : '–'} sub={last ? nameOf(last.conferenceId) : undefined} />
          <Stat label="Intent" value={last ? last.intent : '–'} sub={arc.intentTrend === 'up' ? 'rising' : arc.intentTrend === 'down' ? 'cooling' : 'flat'} />
          <Stat label="Next steps" value={`${arc.nextStepsDone} / ${arc.nextStepsAgreed}`} sub="done / agreed" />
        </div>
      )}

      {arc && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Read of the relationship{ai?.demo ? ' · demo' : ''}
            </p>
            <button type="button" onClick={regenerate} disabled={aiLoading} className="flex items-center gap-1 text-[11.5px] text-ink-dim hover:text-ink disabled:opacity-50" title="Regenerate">
              <RefreshCw className={aiLoading ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} /> {aiLoading ? 'Reading…' : 'Redo'}
            </button>
          </div>
          {ai ? (
            <>
              <p className="mt-2 text-[14px] leading-relaxed text-ink">{ai.summary}</p>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-accent-bright">{ai.nudge}</p>
              {ai.opener && <p className="mt-2 text-[13px] italic leading-relaxed text-ink-muted">Opener: “{ai.opener}”</p>}
            </>
          ) : aiLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3.5 w-11/12 animate-pulse rounded bg-surface-3" />
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-3" />
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-3" />
            </div>
          ) : (
            <p className="mt-2 text-[14px] leading-relaxed text-ink">
              {NUDGE_GOAL[arc.classification]}
              {aiError && <span className="block text-[12px] text-rose">{aiError}</span>}
            </p>
          )}
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {arc.signals.map((s) => (
              <li key={s} className="rounded-md border border-line bg-bg-elevated px-2 py-1 text-[12px] text-ink-muted">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Every meeting</p>
        <ArcTimeline encounters={encounters} reps={reps} conferenceName={nameOf} onToggleNextStep={setNextStepDone} />
      </section>

      <FollowUpSheet open={draftOpen} onClose={closeDraft} contact={contact} arc={arc} />

      <MergeSheet
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        source={contact}
        onMerge={(targetId) => {
          mergeContacts(targetId, contact.id);
          setMergeOpen(false);
          toast.success('Merged', `${contact.canonicalName}'s meetings now belong to one person.`, { label: 'Undo', onClick: () => unmergeContact(targetId) });
          navigate(`/contacts/${targetId}`);
        }}
      />
    </div>
  );
}
