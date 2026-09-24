import type { ArcAssessment, ArcClass, Contact, Encounter, Intent } from '../types';
import { INTENT_LEVEL } from '../types';
import { normalizeCompany } from './normalize';

/**
 * Relationship arc: deterministic classification of a contact's history
 * across conferences. Rules decide the class and emit human-readable
 * signals; the AI layer only writes the narrative on top of this.
 */

const SENIORITY_RULES: Array<[RegExp, number]> = [
  [/\b(ceo|cfo|coo|cto|cro|cpo|chief|founder|co-?founder|president|owner|partner|managing director|treasurer|md)\b/, 5],
  [/\b(vp|svp|evp|vice president|general manager|gm)\b/, 4],
  [/\b(head|director|principal)\b/, 3],
  [/\b(senior manager|sr\.? manager|lead)\b/, 2.5],
  [/\b(manager|senior|sr\.?)\b/, 2],
  [/\b(associate|specialist|consultant|advisor|officer|executive)\b/, 1.5],
  [/\b(analyst|intern|assistant|coordinator|trainee|junior|jr\.?)\b/, 1],
];

export const SENIORITY_LABELS: Record<number, string> = {
  5: 'C-level / owner',
  4: 'VP',
  3: 'Head / Director',
  2.5: 'Senior manager',
  2: 'Manager',
  1.5: 'Associate',
  1: 'Analyst',
};

/** 1 (analyst) to 5 (C-level). Undefined when the title says nothing recognizable. */
export function seniorityLevel(title?: string): number | undefined {
  if (!title) return undefined;
  const t = title.toLowerCase();
  for (const [re, level] of SENIORITY_RULES) if (re.test(t)) return level;
  return undefined;
}

export function monthsBetween(a: string, b: string): number {
  return Math.abs(Date.parse(b) - Date.parse(a)) / (30.44 * 86_400_000);
}

export interface ArcContext {
  now?: string; // ISO date, defaults to today
  conferenceName?: (id: string) => string;
}

export function classifyArc(contact: Contact, allEncounters: Encounter[], ctx: ArcContext = {}): ArcAssessment {
  const encounters = allEncounters.filter((e) => e.contactId === contact.id).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const now = ctx.now ?? new Date().toISOString().slice(0, 10);
  const confName = ctx.conferenceName ?? ((id: string) => id);
  const touches = encounters.length;
  const first = encounters[0];
  const last = encounters[encounters.length - 1];
  const signals: string[] = [];

  if (!first || !last) {
    return {
      classification: 'new',
      confidence: 1,
      signals: ['No meetings logged yet'],
      touches: 0,
      spanMonths: 0,
      seniorityDelta: 0,
      intentTrend: 'flat',
      nextStepsAgreed: 0,
      nextStepsDone: 0,
      lastSeen: '',
      companyChanged: false,
    };
  }

  const spanMonths = monthsBetween(first.capturedAt, last.capturedAt);
  const firstLevel = seniorityLevel(first.title);
  const lastLevel = seniorityLevel(last.title);
  const seniorityDelta = firstLevel !== undefined && lastLevel !== undefined ? lastLevel - firstLevel : 0;
  const intents = encounters.map((e) => INTENT_LEVEL[e.intent]);
  const maxIntent = Math.max(...intents);
  const intentTrend: ArcAssessment['intentTrend'] =
    intents[intents.length - 1]! > intents[0]! ? 'up' : intents[intents.length - 1]! < intents[0]! ? 'down' : 'flat';
  const nextStepsAgreed = encounters.filter((e) => e.nextStep).length;
  const nextStepsDone = encounters.filter((e) => e.nextStep && e.nextStepDone).length;
  const companyChanged = normalizeCompany(first.company) !== normalizeCompany(last.company);
  const monthsSinceLast = monthsBetween(last.capturedAt, now);

  // Signals, in the order a rep would want to read them.
  signals.push(
    touches === 1
      ? `Met once, at ${confName(last.conferenceId)}`
      : `${touches} meetings over ${spanMonths < 1 ? 'the same event' : `${Math.round(spanMonths)} months`}`,
  );
  if (companyChanged) signals.push(`Moved: ${first.company} → ${last.company}`);
  if (seniorityDelta > 0) signals.push(`Seniority up: ${first.title} → ${last.title}`);
  if (seniorityDelta < 0) signals.push(`Seniority down: ${first.title} → ${last.title}`);
  if (touches > 1 && intentTrend === 'up') signals.push(`Intent rising: ${first.intent} → ${last.intent}`);
  if (touches > 1 && intentTrend === 'down') signals.push(`Intent cooling: ${first.intent} → ${last.intent}`);
  if (touches >= 2 && maxIntent <= INTENT_LEVEL.evaluating && intentTrend === 'flat') {
    signals.push(`Never past "${levelName(maxIntent)}" in ${touches} meetings`);
  }
  if (nextStepsAgreed === 0 && touches > 1) signals.push('No next step ever agreed');
  else if (nextStepsAgreed > 0 && nextStepsDone === 0) signals.push(`${nextStepsAgreed} next step${nextStepsAgreed > 1 ? 's' : ''} agreed, none completed`);
  else if (nextStepsDone > 0) signals.push(`${nextStepsDone} of ${nextStepsAgreed} next steps completed`);
  if (last.interest === 'hot') signals.push('Last meeting: hot');
  if (monthsSinceLast >= 1) signals.push(`Last seen ${Math.round(monthsSinceLast)} month${Math.round(monthsSinceLast) === 1 ? '' : 's'} ago at ${confName(last.conferenceId)}`);

  let classification: ArcClass;
  let confidence: number;
  if (touches === 1) {
    classification = 'new';
    confidence = 1;
  } else if (companyChanged && seniorityDelta > 0) {
    classification = 'job-change';
    confidence = 0.85;
    signals.push('A fresh account with an existing relationship');
  } else if (touches >= 3 && spanMonths >= 9 && maxIntent <= INTENT_LEVEL.evaluating && nextStepsDone === 0) {
    classification = 'tire-kicker';
    confidence = touches >= 4 ? 0.9 : 0.75;
  } else if (intentTrend === 'up' || seniorityDelta > 0 || nextStepsDone > 0 || last.interest === 'hot') {
    classification = 'warming';
    const positives = [intentTrend === 'up', seniorityDelta > 0, nextStepsDone > 0, last.interest === 'hot'].filter(Boolean).length;
    confidence = positives >= 2 ? 0.85 : 0.7;
  } else {
    classification = 'stalled';
    confidence = 0.6;
  }

  return {
    classification,
    confidence,
    signals,
    touches,
    spanMonths: Math.round(spanMonths * 10) / 10,
    seniorityDelta,
    intentTrend,
    nextStepsAgreed,
    nextStepsDone,
    lastSeen: last.capturedAt,
    companyChanged,
    ai: contact.arcAi,
  };
}

function levelName(level: number): Intent {
  return (Object.keys(INTENT_LEVEL) as Intent[]).find((k) => INTENT_LEVEL[k] === level) ?? 'curious';
}

/** What the nudge should try to do, by class. The AI writes the words; this sets the goal. */
export const NUDGE_GOAL: Record<ArcClass, string> = {
  new: 'Follow up within 48 hours while the conversation is fresh.',
  warming: 'Close: propose one concrete next step with a date.',
  stalled: 'Re-open with something new: a case study, a product change, a mutual contact.',
  'tire-kicker': 'Qualify or park: ask the budget and timeline question directly.',
  'job-change': 'Re-open as a new account: congratulate, then ask about FX exposure at the new company.',
};
