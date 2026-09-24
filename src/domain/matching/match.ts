import type { Contact, Encounter } from '../types';
import {
  companyFromDomain,
  emailDomain,
  linkedinSlug,
  normalizeCompany,
  normalizeEmail,
  normalizeName,
  phoneKey,
  type NormalizedName,
} from './normalize';
import { companySimilarity, jaroWinkler, tokenSetRatio } from './similarity';

/**
 * "Have we met this person?" Candidate generation with an explainable
 * confidence and a reason for every score. See docs/PLAN.md §5.3.
 *
 * Thresholds: ≥ AUTO_LINK links silently (with Undo). Between ASK and
 * AUTO_LINK the UI shows a one-tap "Same person?" card. Below ASK the
 * candidate is not shown.
 */
export const AUTO_LINK = 0.85;
export const ASK = 0.5;

export type MatchFlag = 'possible-job-change' | 'name-variant' | 'needs-confirmation' | 'common-name';

export interface MatchInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

export interface MatchCandidate {
  contact: Contact;
  confidence: number;
  reasons: string[];
  flags: MatchFlag[];
}

interface ContactProfile {
  contact: Contact;
  names: NormalizedName[];
  companies: string[]; // normalized, every company ever seen
  domains: string[]; // non-free email domains
  emails: Set<string>;
  phones: Set<string>;
  linkedin?: string;
}

function profile(contact: Contact, encounters: Encounter[]): ContactProfile {
  const own = encounters.filter((e) => e.contactId === contact.id);
  const names = [contact.canonicalName, ...contact.aliases, ...own.map((e) => e.name)].filter(Boolean).map(normalizeName);
  const companies = [contact.currentCompany, ...own.map((e) => e.company)].filter(Boolean).map(normalizeCompany);
  const emails = [...contact.emails, ...own.map((e) => e.email ?? '')].filter(Boolean).map(normalizeEmail);
  const phones = [...contact.phones, ...own.map((e) => e.phone ?? '')].filter(Boolean).map(phoneKey);
  const domains = emails.map(emailDomain).filter(Boolean);
  const linkedin = contact.linkedin ?? own.find((e) => e.linkedin)?.linkedin;
  return {
    contact,
    names,
    companies: [...new Set(companies)],
    domains: [...new Set(domains)],
    emails: new Set(emails),
    phones: new Set(phones),
    linkedin: linkedin ? linkedinSlug(linkedin) : undefined,
  };
}

/** Name similarity on the literal spelling, no nickname or transliteration help. */
export function rawNameScore(a: NormalizedName, b: NormalizedName): number {
  if (!a.full || !b.full) return 0;
  // Initial-only first name: "S. Chen" vs "Sarah Chen".
  const initialCase = initialMatch(a, b) ?? initialMatch(b, a);
  if (initialCase !== undefined) return initialCase;
  // Single-token name (surname only) against a full name is never strong.
  if (a.tokens.length === 1 || b.tokens.length === 1) {
    return Math.min(0.8, Math.max(jaroWinkler(a.full, b.full), tokenSetRatio(a.full, b.full)));
  }
  return Math.max(jaroWinkler(a.full, b.full), tokenSetRatio(a.full, b.full), firstLastScore(a.first, b.first, a.last, b.last));
}

/**
 * Weighted first/last composite. Gated on the first name: two people who share
 * a surname but have different first names must never reach the auto band.
 */
function firstLastScore(firstA: string, firstB: string, lastA: string, lastB: string): number {
  const f = jaroWinkler(firstA, firstB);
  const l = jaroWinkler(lastA, lastB);
  const composite = 0.4 * f + 0.6 * l;
  return f >= 0.9 ? composite : Math.min(0.84, composite);
}

function initialMatch(short: NormalizedName, long: NormalizedName): number | undefined {
  if (short.tokens.length !== 1 || short.initials.length === 0 || long.tokens.length < 2) return undefined;
  const lastSim = jaroWinkler(short.full, long.last);
  if (lastSim < 0.9) return 0.3;
  return short.initials[0] === long.first[0] ? 0.9 : 0.5;
}

/** Name similarity after nickname expansion and surname variant folding. */
export function canonicalNameScore(a: NormalizedName, b: NormalizedName): number {
  if (!a.canonicalFull || !b.canonicalFull) return 0;
  if (a.tokens.length === 1 || b.tokens.length === 1) return rawNameScore(a, b);
  return Math.max(
    jaroWinkler(a.canonicalFull, b.canonicalFull),
    tokenSetRatio(a.canonicalFull, b.canonicalFull),
    firstLastScore(a.canonicalFirst, b.canonicalFirst, a.canonicalLast, b.canonicalLast),
  );
}

function bestName(input: NormalizedName, names: NormalizedName[]): { raw: number; canonical: number; against?: NormalizedName } {
  let raw = 0;
  let canonical = 0;
  let against: NormalizedName | undefined;
  for (const n of names) {
    const r = rawNameScore(input, n);
    const c = canonicalNameScore(input, n);
    if (Math.max(r, c) > Math.max(raw, canonical)) against = n;
    raw = Math.max(raw, r);
    canonical = Math.max(canonical, c);
  }
  return { raw, canonical, against };
}

function explainVariant(input: NormalizedName, against: NormalizedName): string {
  const bits: string[] = [];
  if (input.first !== against.first && input.canonicalFirst === against.canonicalFirst) {
    bits.push(`"${cap(input.first)}" and "${cap(against.first)}" are the same first name`);
  }
  if (input.last !== against.last && input.canonicalLast === against.canonicalLast) {
    bits.push(`"${cap(input.last)}" is a spelling of "${cap(against.last)}"`);
  }
  if (bits.length === 0) bits.push('Names are close but not identical');
  return bits.join('; ');
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** How many distinct people share this exact canonical name across different companies. */
function commonNameCount(name: NormalizedName, profiles: ContactProfile[]): number {
  const seen = new Set<string>();
  for (const p of profiles) {
    if (p.names.some((n) => n.canonicalFull === name.canonicalFull)) {
      for (const c of p.companies) seen.add(c);
      if (p.companies.length === 0) seen.add(p.contact.id);
    }
  }
  return seen.size;
}

export function findCandidates(input: MatchInput, contacts: Contact[], encounters: Encounter[]): MatchCandidate[] {
  const profiles = contacts.map((c) => profile(c, encounters));
  const inName = normalizeName(input.name);
  const inCompany = input.company ? normalizeCompany(input.company) : '';
  const inEmail = input.email ? normalizeEmail(input.email) : '';
  const inDomain = input.email ? emailDomain(input.email) : '';
  const inDomainCompany = companyFromDomain(inDomain);
  const inPhone = input.phone ? phoneKey(input.phone) : '';
  const inLinkedin = input.linkedin ? linkedinSlug(input.linkedin) : '';
  const common = inName.full ? commonNameCount(inName, profiles) : 0;

  const out: MatchCandidate[] = [];
  for (const p of profiles) {
    const reasons: string[] = [];
    const flags: MatchFlag[] = [];
    let confidence = 0;

    // Hard identifiers.
    if (inEmail && p.emails.has(inEmail)) {
      confidence = 1;
      reasons.push('Same email address');
    } else if (inLinkedin && p.linkedin && p.linkedin === inLinkedin) {
      confidence = 1;
      reasons.push('Same LinkedIn profile');
    } else if (inPhone && p.phones.has(inPhone)) {
      confidence = 0.95;
      reasons.push('Same phone number');
    }

    // Name and company.
    const { raw, canonical, against } = bestName(inName, p.names);
    const companySim = inCompany ? Math.max(0, ...p.companies.map((c) => companySimilarity(inCompany, c))) : 0;
    const domainMatch =
      (!!inDomain && p.domains.includes(inDomain)) ||
      (!!inDomainCompany && p.companies.some((c) => companySimilarity(inDomainCompany, c) >= 0.9));
    const knownCompanies = p.companies.length > 0;
    let nameScore = 0;

    if (raw >= 0.92 && companySim >= 0.8) {
      nameScore = 0.9;
      reasons.push('Name and company match');
    } else if (raw >= 0.92 && domainMatch) {
      nameScore = 0.88;
      reasons.push('Name matches and the email domain is their company');
    } else if (canonical >= 0.92 && raw < 0.92 && (companySim >= 0.8 || domainMatch)) {
      nameScore = 0.72;
      flags.push('name-variant');
      reasons.push(against ? explainVariant(inName, against) : 'Name variant');
      reasons.push('Same company');
    } else if (raw >= 0.85 && raw < 0.92 && (companySim >= 0.8 || domainMatch)) {
      nameScore = 0.72;
      flags.push('name-variant');
      reasons.push('Name is close, same company');
    } else if (raw >= 0.92 && inCompany && knownCompanies) {
      // Same spelling, company does not match anything we know: likely moved jobs. Ask.
      nameScore = 0.62;
      flags.push('possible-job-change');
      reasons.push(`Same name, different company: ${p.contact.currentCompany || cap(p.companies[p.companies.length - 1]!)} → ${input.company}`);
    } else if (raw >= 0.92 && (!inCompany || !knownCompanies)) {
      nameScore = 0.55;
      flags.push('needs-confirmation');
      reasons.push('Same name, no company to compare');
    } else if (canonical >= 0.92 && !inCompany) {
      nameScore = 0.5;
      flags.push('needs-confirmation');
      reasons.push(against ? explainVariant(inName, against) : 'Name variant');
    }

    if (nameScore > 0 && common >= 3) {
      nameScore -= 0.15;
      flags.push('common-name');
      reasons.push(`${common} different people share this name`);
    }

    confidence = Math.max(confidence, nameScore);
    if (confidence >= ASK) out.push({ contact: p.contact, confidence: round2(confidence), reasons, flags });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function bestCandidate(input: MatchInput, contacts: Contact[], encounters: Encounter[]): MatchCandidate | undefined {
  return findCandidates(input, contacts, encounters)[0];
}
