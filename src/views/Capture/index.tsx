import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Camera, Check, ChevronDown, Keyboard, Mail, Plus, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { InterestDot } from '@/components/ui/Badge';
import { Toaster, toast } from '@/components/ui/Toast';
import { useData, newId } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useArcs, useCurrentConference, useConference } from '@/store/selectors';
import { findCandidates, AUTO_LINK, ASK, type MatchCandidate } from '@/domain/matching/match';
import type { Conference, Encounter } from '@/domain/types';
import { listen, speechSupported, type Listener } from '@/lib/speech';
import { quickParse } from '@/lib/quickParse';
import { aiIsLive, bootstrapAiStatus, callAi, type Lead } from '@/lib/ai';
import { useArcAi } from '@/lib/useArcAi';
import { demoExtract } from '@/data/seed/demoAi';
import { NEXT_STEPS, PAIN_POINTS } from '@/data/seed/contacts';
import { fmtDateRange, fmtDateTime, plural } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CaptureForm, EMPTY_DRAFT, type Draft } from './CaptureForm';
import { MatchCard, type LinkState } from './MatchCard';
import { VoiceButton } from './VoiceButton';
import { ConferencePicker } from './ConferencePicker';

function leadToDraft(lead: Lead, notes: string): { patch: Partial<Draft>; filled: (keyof Draft)[] } {
  const filled: (keyof Draft)[] = [];
  const patch: Partial<Draft> = { notes: notes || lead.summary, interest: lead.interest, intent: lead.intent, painPoints: lead.painPoints.filter((p) => PAIN_POINTS.includes(p)) };
  if (lead.name) (patch.name = lead.name), filled.push('name');
  if (lead.company) (patch.company = lead.company), filled.push('company');
  if (lead.title) (patch.title = lead.title), filled.push('title');
  if (lead.email) (patch.email = lead.email), filled.push('email');
  if (lead.phone) patch.phone = lead.phone;
  if (lead.linkedin) patch.linkedin = lead.linkedin;
  if (lead.nextStep && NEXT_STEPS.includes(lead.nextStep)) patch.nextStep = lead.nextStep;
  return { patch, filled };
}

type Stage = 'idle' | 'listening' | 'extracting' | 'form' | 'saved';
type Source = Encounter['source'];

export default function Capture() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const fallback = useCurrentConference();
  const fromParam = useConference(params.get('conf') ?? undefined);
  const conference = fromParam ?? fallback;

  const reps = useData((s) => s.reps);
  const contacts = useData((s) => s.contacts);
  const encounters = useData((s) => s.encounters);
  const addEncounter = useData((s) => s.addEncounter);
  const currentRepId = useSettings((s) => s.currentRepId);
  const rep = reps.find((r) => r.id === currentRepId) ?? reps[0];
  const arcs = useArcs();

  const [stage, setStage] = useState<Stage>('idle');
  const [source, setSource] = useState<Source>('typed');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [highlight, setHighlight] = useState<(keyof Draft)[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [link, setLink] = useState<LinkState>(null);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [savedId, setSavedId] = useState<string>();
  const [cardPreview, setCardPreview] = useState<string>();
  const listenerRef = useRef<Listener | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live matching, debounced.
  const [candidate, setCandidate] = useState<MatchCandidate>();
  useEffect(() => {
    if (stage !== 'form') return;
    const name = draft.name.trim();
    if (name.length < 3) {
      setCandidate(undefined);
      return;
    }
    const t = setTimeout(() => {
      const list = findCandidates({ name, company: draft.company || undefined, email: draft.email || undefined, phone: draft.phone || undefined, linkedin: draft.linkedin || undefined }, contacts, encounters).filter(
        (c) => !rejected.has(c.contact.id),
      );
      const best = list[0];
      setCandidate(best);
      if (best && best.confidence >= AUTO_LINK) setLink((l) => (l && l.mode === 'confirmed' ? l : { contactId: best.contact.id, mode: 'auto' }));
      else setLink((l) => (l && l.mode === 'confirmed' ? l : null));
    }, 250);
    return () => clearTimeout(t);
  }, [draft.name, draft.company, draft.email, draft.phone, draft.linkedin, contacts, encounters, rejected, stage]);

  const linkedContact = link ? contacts.find((c) => c.id === link.contactId) : undefined;
  const askCandidate = !link && candidate && candidate.confidence >= ASK && candidate.confidence < AUTO_LINK ? candidate : undefined;
  const linkedArc = linkedContact ? arcs.get(linkedContact.id) : undefined;
  const { ai: linkedAi, loading: linkedAiLoading } = useArcAi(linkedContact, linkedArc, { auto: !!linkedContact });

  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);

  // ---- Voice ----
  const stopListening = useCallback(() => {
    listenerRef.current?.stop();
    listenerRef.current = undefined;
  }, []);

  const [aiUsed, setAiUsed] = useState(false);
  const finishTranscript = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) {
        setStage('idle');
        return;
      }
      setStage('extracting');
      setSource('voice');
      await bootstrapAiStatus();

      const applyParsed = (patch: Partial<Draft>, filled: (keyof Draft)[]) => {
        setDraft((d) => ({ ...d, ...patch }));
        setHighlight(filled);
        setStage('form');
        setTimeout(() => setHighlight([]), 2200);
      };

      // Heuristic parse is always available; the model replaces it when a key exists.
      const heuristic = () => {
        const parsed = quickParse(clean);
        const filled: (keyof Draft)[] = [];
        const patch: Partial<Draft> = { notes: clean, interest: parsed.interest, intent: parsed.intent, painPoints: parsed.painPoints };
        if (parsed.name) (patch.name = parsed.name), filled.push('name');
        if (parsed.company) (patch.company = parsed.company), filled.push('company');
        if (parsed.title) (patch.title = parsed.title), filled.push('title');
        if (parsed.email) (patch.email = parsed.email), filled.push('email');
        if (parsed.phone) patch.phone = parsed.phone;
        if (parsed.nextStep) patch.nextStep = parsed.nextStep;
        return { patch, filled };
      };

      try {
        const candidates = quickCandidates(clean);
        const res = await callAi<Lead>(
          'extractLead',
          {
            transcript: clean,
            conference: conference ? { name: conference.name, city: conference.city, dates: fmtDateRange(conference.startDate, conference.endDate) } : undefined,
            repName: rep?.name,
            candidates,
            painOptions: PAIN_POINTS,
            nextStepOptions: NEXT_STEPS,
          },
          () => demoExtract(clean),
        );
        setAiUsed(!res.demo);
        const { patch, filled } = leadToDraft(res.data, clean);
        applyParsed(patch, filled);
      } catch (e) {
        const { patch, filled } = heuristic();
        setTimeout(() => applyParsed(patch, filled), 400);
        if (aiIsLive()) toast.error('AI extraction failed, used a quick parse instead', e instanceof Error ? e.message : undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conference?.id, rep?.id, contacts, encounters],
  );

  /** Cheap pre-match so the model can normalise spelling to a known person. */
  function quickCandidates(text: string): { name: string; company: string; title?: string }[] {
    const words = new Set(text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2));
    return contacts
      .filter((c) => c.encounterIds.length > 0)
      .filter((c) => c.canonicalName.toLowerCase().split(' ').some((p) => words.has(p)) || words.has(c.currentCompany.toLowerCase().split(' ')[0] ?? ''))
      .slice(0, 5)
      .map((c) => ({ name: c.canonicalName, company: c.currentCompany, title: c.currentTitle }));
  }

  const toggleListening = () => {
    if (stage === 'listening') {
      stopListening();
      void finishTranscript(transcript);
      return;
    }
    setInterim('');
    setTranscript('');
    setStage('listening');
    listenerRef.current = listen({
      onInterim: setInterim,
      onFinal: setTranscript,
      onError: (m) => {
        toast.error(m);
        setStage('idle');
      },
      onEnd: () => {
        listenerRef.current = undefined;
        setStage((s) => {
          if (s === 'listening') {
            // Browser ended the session (silence). Use what we have.
            setTimeout(() => void finishTranscript(transcript), 0);
            return 'extracting';
          }
          return s;
        });
      },
    });
  };
  useEffect(() => () => stopListening(), [stopListening]);

  // Dev and demo hooks: ?mode=type opens the form, ?say=<text> replays a transcript.
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const say = params.get('say');
    if (say) {
      setTranscript(say);
      void finishTranscript(say);
    } else if (params.get('mode') === 'type') {
      setStage('form');
    }
  }, [params, finishTranscript]);

  // ---- Card photo ----
  const onCardFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setCardPreview(dataUrl);
      setSource('card');
      await bootstrapAiStatus();
      if (!aiIsLive()) {
        setStage('form');
        toast.info('Card captured', 'Add an Anthropic key in Settings to read cards automatically. For now, type what you see.');
        return;
      }
      setStage('extracting');
      try {
        const res = await callAi<Lead>('extractCard', {
          image: dataUrl,
          conference: conference ? { name: conference.name, city: conference.city } : undefined,
          painOptions: PAIN_POINTS,
          nextStepOptions: NEXT_STEPS,
        });
        setAiUsed(true);
        const { patch, filled } = leadToDraft(res.data, '');
        setDraft((d) => ({ ...d, ...patch }));
        setHighlight(filled);
        setStage('form');
        setTimeout(() => setHighlight([]), 2200);
      } catch (e) {
        setStage('form');
        toast.error('Could not read the card', e instanceof Error ? e.message : undefined);
      }
    };
    reader.readAsDataURL(file);
  };

  // ---- Save ----
  const canSave = draft.name.trim().length > 1;
  const save = () => {
    if (!conference || !rep || !canSave) return;
    const id = newId('e');
    addEncounter(
      {
        id,
        conferenceId: conference.id,
        repId: rep.id,
        capturedAt: new Date().toISOString(),
        name: draft.name.trim(),
        company: draft.company.trim(),
        title: draft.title.trim() || undefined,
        email: draft.email.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        linkedin: draft.linkedin.trim() || undefined,
        interest: draft.interest,
        intent: draft.intent,
        painPoints: draft.painPoints,
        notes: draft.notes.trim(),
        nextStep: draft.nextStep || undefined,
        source,
      },
      link?.contactId,
    );
    setSavedId(id);
    setStage('saved');
  };

  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setLink(null);
    setRejected(new Set());
    setCandidate(undefined);
    setTranscript('');
    setInterim('');
    setCardPreview(undefined);
    setSource('typed');
    setSavedId(undefined);
    setAiUsed(false);
    setStage('idle');
  };

  const recent = useMemo(
    () => (conference ? encounters.filter((e) => e.conferenceId === conference.id).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 6) : []),
    [encounters, conference],
  );
  const savedEncounter = savedId ? encounters.find((e) => e.id === savedId) : undefined;
  const savedContact = savedEncounter ? contacts.find((c) => c.id === savedEncounter.contactId) : undefined;
  const savedArc = savedContact ? arcs.get(savedContact.id) : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 pb-32 pt-3 lg:pt-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center gap-2">
        <NavLink to="/" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </NavLink>
        <button type="button" onClick={() => setPickerOpen(true)} className="min-w-0 flex-1 rounded-xl px-2 py-1 text-left hover:bg-surface-2">
          <p className="truncate text-[15px] font-semibold text-ink">
            {conference?.name ?? 'Pick an event'} <ChevronDown className="inline h-4 w-4 text-ink-dim" />
          </p>
          <p className="truncate text-[12px] text-ink-muted">{conference ? `${fmtDateRange(conference.startDate, conference.endDate)} · ${conference.city}` : 'Where are you right now?'}</p>
        </button>
        {rep && (
          <NavLink to="/settings" title={`${rep.name}. Change in Settings.`}>
            <Avatar name={rep.name} color={rep.color} size={34} />
          </NavLink>
        )}
      </div>

      <ConferencePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        current={conference}
        onPick={(c: Conference) => {
          const next = new URLSearchParams(params);
          next.set('conf', c.id);
          setParams(next, { replace: true });
        }}
      />

      <AnimatePresence mode="wait">
        {(stage === 'idle' || stage === 'listening' || stage === 'extracting') && (
          <motion.section key="capture-entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="mt-6 flex flex-col items-center">
            <p className="display text-center text-[30px] leading-tight text-ink">{stage === 'listening' ? 'Listening…' : stage === 'extracting' ? (aiIsLive() ? 'Got it. Reading…' : 'Got it. Filling the form…') : 'Who did you just meet?'}</p>
            <p className="mt-1.5 max-w-[300px] text-center text-[13px] text-ink-muted">
              {stage === 'listening' ? 'Say the name, company, role, and what they care about. Tap to stop.' : stage === 'extracting' ? '' : 'Tap the mic and talk. Or snap their card. Ten seconds, done.'}
            </p>

            <div className="mt-6">
              <VoiceButton listening={stage === 'listening'} onToggle={toggleListening} disabled={stage === 'extracting' || !speechSupported()} size={96} />
            </div>

            <div className="mt-2 min-h-[64px] w-full px-2 text-center">
              {(transcript || interim) && (
                <p className="text-[15px] leading-snug text-ink">
                  {transcript} <span className="text-ink-dim">{interim}</span>
                </p>
              )}
              {!speechSupported() && stage === 'idle' && <p className="text-[12.5px] text-rose">Voice needs Chrome, Edge or Safari. Type instead.</p>}
            </div>

            <div className="mt-2 grid w-full grid-cols-2 gap-3">
              <Button size="xl" icon={<Camera className="h-5 w-5" />} onClick={() => fileRef.current?.click()} disabled={stage !== 'idle'}>
                Snap card
              </Button>
              <Button
                size="xl"
                icon={<Keyboard className="h-5 w-5" />}
                onClick={() => {
                  setSource('typed');
                  setStage('form');
                }}
                disabled={stage !== 'idle'}
              >
                Type it
              </Button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onCardFile(e.target.files[0])} />
            </div>

            <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-ink-dim">
              <Sparkles className="h-3.5 w-3.5" /> Try: “Met Sarah Chen from Adyen, head of treasury, they hedge EUR manually, wants a demo in Q1.”
            </p>
          </motion.section>
        )}

        {stage === 'form' && (
          <motion.section key="capture-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-5">
            {cardPreview && (
              <div className="mb-4 overflow-hidden rounded-xl border border-line">
                <img src={cardPreview} alt="Business card" className="max-h-40 w-full object-cover" />
              </div>
            )}
            {aiUsed && (
              <p className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-dim">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Filled by AI from your {source === 'card' ? 'card photo' : 'words'}. Check the name and company.
              </p>
            )}
            <CaptureForm draft={draft} onChange={patch} highlight={highlight}>
              <MatchCard
                candidate={askCandidate}
                link={link}
                linkedContact={linkedContact}
                arc={linkedContact ? arcs.get(linkedContact.id) : askCandidate ? arcs.get(askCandidate.contact.id) : undefined}
                onConfirm={(id) => setLink({ contactId: id, mode: 'confirmed' })}
                onReject={(id) => {
                  setRejected((s) => new Set([...s, id]));
                  setLink(null);
                }}
                onUndo={() => {
                  if (link) setRejected((s) => new Set([...s, link.contactId]));
                  setLink(null);
                }}
                aiSummary={linkedAi ? { summary: linkedAi.summary, nudge: linkedAi.nudge, demo: linkedAi.demo } : undefined}
                aiLoading={linkedAiLoading}
              />
            </CaptureForm>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 px-4 pt-3 backdrop-blur-md safe-bottom">
              <div className="mx-auto flex max-w-[460px] gap-2">
                <Button size="lg" variant="ghost" onClick={reset}>
                  Discard
                </Button>
                <Button size="lg" variant="primary" block disabled={!canSave} onClick={save} icon={<Check className="h-5 w-5" />}>
                  Save lead{linkedContact ? ` · ${linkedContact.canonicalName.split(' ')[0]}` : ''}
                </Button>
              </div>
            </div>
          </motion.section>
        )}

        {stage === 'saved' && savedEncounter && (
          <motion.section key="capture-saved" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 flex flex-col items-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-teal text-bg shadow-glow-teal">
              <Check className="h-10 w-10" strokeWidth={3} />
            </motion.div>
            <p className="display mt-4 text-[28px] text-ink">Saved.</p>
            <p className="mt-1 text-center text-[13.5px] text-ink-muted">
              {savedEncounter.name}
              {savedEncounter.company ? `, ${savedEncounter.company}` : ''}. {savedArc && savedArc.touches > 1 ? `Meeting ${savedArc.touches} with this person.` : 'New contact.'} {plural(recent.length, 'lead')} at {conference?.series ?? 'this event'} so far.
            </p>
            <div className="mt-6 grid w-full gap-2">
              <Button size="xl" variant="primary" icon={<Plus className="h-5 w-5" />} onClick={reset}>
                Capture another
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" icon={<Upload className="h-4 w-4" />} onClick={() => navigate(`/contacts/${savedEncounter.contactId}?push=${savedEncounter.id}`)}>
                  Push to HubSpot
                </Button>
                <Button size="lg" icon={<Mail className="h-4 w-4" />} onClick={() => navigate(`/contacts/${savedEncounter.contactId}?draft=${savedEncounter.id}`)}>
                  Draft follow-up
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Recent captures */}
      {stage !== 'form' && recent.length > 0 && (
        <section className="mt-8">
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Captured at {conference?.series ?? 'this event'}</p>
          <ul className="flex flex-col gap-1.5">
            {recent.map((e) => {
              const c = contacts.find((k) => k.id === e.contactId);
              const arc = c ? arcs.get(c.id) : undefined;
              return (
                <li key={e.id}>
                  <NavLink to={`/contacts/${e.contactId}`} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated px-3 py-2.5">
                    <Avatar name={e.name} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                        {e.name} <InterestDot interest={e.interest} />
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-muted">
                        {e.company}
                        {e.nextStep ? ` · ${e.nextStep}` : ''} · {fmtDateTime(e.capturedAt)}
                      </span>
                    </span>
                    <span className={cn('text-[10.5px] font-semibold uppercase tracking-wider', e.hubspot?.status === 'synced' ? 'text-teal' : 'text-ink-dim')}>{e.hubspot?.status === 'synced' ? 'synced' : arc && arc.touches > 1 ? `${arc.touches}×` : 'new'}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
