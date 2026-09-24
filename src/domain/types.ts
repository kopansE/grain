/**
 * Domain model for Grain Orbit. Pure types, no runtime code.
 * See docs/PLAN.md §3 for the rationale behind each field.
 */

export type Region = 'EMEA' | 'NA' | 'APAC' | 'LATAM' | 'MEA' | 'IL';

export const REGION_LABELS: Record<Region, string> = {
  EMEA: 'Europe',
  NA: 'North America',
  APAC: 'Asia Pacific',
  LATAM: 'Latin America',
  MEA: 'Middle East & Africa',
  IL: 'Israel',
};

export type Vertical =
  | 'payments'
  | 'fintech'
  | 'treasury'
  | 'travel'
  | 'banking'
  | 'ecommerce'
  | 'crypto'
  | 'saas'
  | 'insurtech';

export const VERTICAL_LABELS: Record<Vertical, string> = {
  payments: 'Payments',
  fintech: 'Fintech',
  treasury: 'Treasury',
  travel: 'Travel',
  banking: 'Banking',
  ecommerce: 'Ecommerce',
  crypto: 'Crypto',
  saas: 'SaaS',
  insurtech: 'Insurtech',
};

export type ConferenceStatus = 'considering' | 'planned' | 'attended' | 'skipped';

export interface IcpInputs {
  /** 0–10. How much of the agenda is payments, treasury, FX, cross-border. */
  verticalFit: number;
  /** 0–10. Share of attendees who are PSPs, cross-border payment cos, travel wholesalers, treasurers. */
  buyerDensity: number;
  /** 0–10. Are decision-makers (CFO, Treasurer, Head of Payments) actually in the room. */
  seniority: number;
}

export interface ConferenceHistory {
  year: number;
  leads: number;
  pipelineUsd: number;
  notes?: string;
}

export interface Conference {
  id: string;
  /** Family name, e.g. "Money20/20". Used for cross-conference contact hints. */
  series: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  city: string;
  country: string;
  /** ISO 3166-1 alpha-2, for the flag. */
  countryCode: string;
  region: Region;
  lat: number;
  lng: number;
  verticals: Vertical[];
  audienceSize: number;
  url?: string;
  description: string;
  icpInputs: IcpInputs;
  costs: { ticketUsd: number; boothUsd?: number };
  status: ConferenceStatus;
  assignedRepIds: string[];
  history?: ConferenceHistory[];
  source: 'seed' | 'ai' | 'manual';
  datesConfirmed: boolean;
}

export type Tier = 'anchor' | 'cover' | 'opportunistic' | 'skip';

export const TIER_LABELS: Record<Tier, string> = {
  anchor: 'Anchor',
  cover: 'Cover',
  opportunistic: 'Opportunistic',
  skip: 'Skip',
};

export const TIER_BLURBS: Record<Tier, string> = {
  anchor: 'Must attend. Booth or full team.',
  cover: 'Send one or two reps to walk the floor.',
  opportunistic: 'Only if it piggybacks on an Anchor trip.',
  skip: 'Not worth the flight.',
};

export interface ScoringWeights {
  verticalFit: number;
  buyerDensity: number;
  seniority: number;
  reach: number;
  cost: number;
  trackRecord: number;
}

export interface ScoreComponent {
  key: keyof ScoringWeights;
  label: string;
  /** Normalized weight, 0–1. */
  weight: number;
  /** Raw component value, 0–1. */
  value: number;
  /** weight × value × 100. */
  contribution: number;
  /** One line a salesperson can read. */
  note: string;
}

export interface ScoreResult {
  /** Final score, 0–100, including any cluster bonus. */
  score: number;
  /** Score before the cluster bonus. */
  base: number;
  clusterBonus: number;
  /** Conference id this event piggybacks on, if the bonus applied. */
  piggybackOf?: string;
  tier: Tier;
  components: ScoreComponent[];
}

export type Interest = 'hot' | 'warm' | 'cold';
export type Intent = 'curious' | 'evaluating' | 'budget' | 'champion';

export const INTENT_LEVEL: Record<Intent, number> = { curious: 1, evaluating: 2, budget: 3, champion: 4 };

export type HubspotSyncStatus = 'unsynced' | 'synced' | 'failed';

export interface HubspotSync {
  status: HubspotSyncStatus;
  contactId?: string;
  noteId?: string;
  pushedAt?: string;
  error?: string;
}

/** One meeting with one person at one conference. Called a "lead" in the UI. */
export interface Encounter {
  id: string;
  contactId: string;
  conferenceId: string;
  repId: string;
  capturedAt: string; // ISO datetime
  name: string;
  company: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  interest: Interest;
  intent: Intent;
  painPoints: string[];
  notes: string;
  nextStep?: string;
  nextStepDone?: boolean;
  source: 'voice' | 'card' | 'typed' | 'seed';
  hubspot?: HubspotSync;
}

export type ArcClass = 'new' | 'warming' | 'stalled' | 'tire-kicker' | 'job-change';

export const ARC_LABELS: Record<ArcClass, string> = {
  new: 'New',
  warming: 'Warming',
  stalled: 'Stalled',
  'tire-kicker': 'Tire-kicker',
  'job-change': 'Job change',
};

export interface ArcAi {
  summary: string;
  nudge: string;
  opener: string;
  generatedAt: string;
  demo: boolean;
}

export interface ArcAssessment {
  classification: ArcClass;
  confidence: number;
  /** Human-readable signals, e.g. "Seniority up: Analyst → Head of Treasury". */
  signals: string[];
  touches: number;
  spanMonths: number;
  seniorityDelta: number;
  intentTrend: 'up' | 'flat' | 'down';
  nextStepsAgreed: number;
  nextStepsDone: number;
  lastSeen: string;
  companyChanged: boolean;
  ai?: ArcAi;
}

/** One human, across every encounter. */
export interface Contact {
  id: string;
  canonicalName: string;
  aliases: string[];
  emails: string[];
  phones: string[];
  linkedin?: string;
  currentCompany: string;
  currentTitle?: string;
  encounterIds: string[];
  /** Contact ids merged into this one, kept so a merge can be undone. */
  mergedFrom?: string[];
  /** AI narrative for the relationship arc. The arc itself is derived at runtime and never stored. */
  arcAi?: ArcAi;
  hubspotContactId?: string;
}

export type HomeBaseCode = 'TLV' | 'NYC' | 'LON';

export interface Rep {
  id: string;
  name: string;
  initials: string;
  /** Tailwind-friendly hex used for avatars, globe arcs and timeline bars. */
  color: string;
  homeBase: HomeBaseCode;
  role: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}
