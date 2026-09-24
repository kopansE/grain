import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArcAssessment, Contact, Encounter } from '@/domain/types';
import { NUDGE_GOAL } from '@/domain/matching/arc';
import { useData } from '@/store/data';
import { selectAiLive, useSettings } from '@/store/settings';
import { useConferenceNameLookup, useEncountersFor } from '@/store/selectors';
import { callAi, type ArcAi } from './ai';
import { demoArc } from '@/data/seed/demoAi';

export function encountersForAi(list: Encounter[], nameOf: (id: string) => string, reps: { id: string; name: string }[]) {
  return list.map((e) => ({
    conference: nameOf(e.conferenceId),
    date: e.capturedAt.slice(0, 10),
    title: e.title,
    company: e.company,
    interest: e.interest,
    intent: e.intent,
    notes: e.notes,
    painPoints: e.painPoints,
    nextStep: e.nextStep,
    nextStepDone: e.nextStepDone,
    rep: reps.find((r) => r.id === e.repId)?.name.split(' ')[0],
  }));
}

/**
 * The AI read of a relationship, generated once per contact and cached on
 * the contact record. Regenerates when the number of meetings changes.
 * In demo mode returns the hand-written demo text instantly.
 */
export function useArcAi(contact: Contact | undefined, arc: ArcAssessment | undefined, opts: { auto?: boolean } = { auto: true }) {
  const encounters = useEncountersFor(contact?.id);
  const reps = useData((s) => s.reps);
  const setArcAi = useData((s) => s.setArcAi);
  const nameOf = useConferenceNameLookup();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const inflight = useRef<string | undefined>(undefined);
  const live = useSettings(selectAiLive);

  // Stale when a newer meeting exists, or when a demo read is cached but a live model is now available.
  const stale = !!contact?.arcAi && !!arc && (contact.arcAi.generatedAt < arc.lastSeen || (contact.arcAi.demo && live));
  const ai = contact?.arcAi && !stale ? contact.arcAi : contact?.arcAi && !live ? contact.arcAi : undefined;

  const generate = useCallback(
    async (force = false) => {
      if (!contact || !arc || encounters.length === 0) return;
      const key = `${contact.id}:${encounters.length}:${force ? Date.now() : 0}`;
      if (inflight.current === key) return;
      inflight.current = key;
      setLoading(true);
      setError(undefined);
      try {
        const res = await callAi<ArcAi>(
          'arcSummary',
          {
            contact: { name: contact.canonicalName, company: contact.currentCompany, title: contact.currentTitle },
            classification: arc.classification,
            signals: arc.signals,
            nudgeGoal: NUDGE_GOAL[arc.classification],
            today: new Date().toISOString().slice(0, 10),
            encounters: encountersForAi(encounters, nameOf, reps),
          },
          () => demoArc(contact.id, arc.classification, contact.canonicalName, contact.currentCompany),
        );
        setArcAi(contact.id, { ...res.data, generatedAt: new Date().toISOString(), demo: res.demo });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not generate the summary.');
      } finally {
        setLoading(false);
        inflight.current = undefined;
      }
    },
    [contact, arc, encounters, nameOf, reps, setArcAi],
  );

  useEffect(() => {
    if (!opts.auto) return;
    if (contact && arc && (!ai || (ai.demo && live)) && !loading && !error && encounters.length > 0) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id, arc?.touches, ai, opts.auto, live]);

  return { ai, loading, error, regenerate: () => generate(true) };
}
