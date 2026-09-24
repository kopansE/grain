import { describe, expect, it } from 'vitest';
import type { Contact, Encounter } from '../types';
import { companyFromDomain, emailDomain, linkedinSlug, normalizeCompany, normalizeEmail, normalizeName, phoneKey } from './normalize';
import { companySimilarity, jaroWinkler, tokenSetRatio } from './similarity';
import { ASK, AUTO_LINK, findCandidates } from './match';
import { classifyArc, seniorityLevel } from './arc';

// ---------- fixtures ----------
let seq = 0;
function contact(overrides: Partial<Contact> & { canonicalName: string; currentCompany: string }): Contact {
  return { id: 'c' + ++seq, aliases: [], emails: [], phones: [], encounterIds: [], ...overrides };
}
function encounter(overrides: Partial<Encounter> & { contactId: string; name: string; company: string; capturedAt: string }): Encounter {
  return {
    id: 'e' + ++seq,
    conferenceId: 'conf',
    repId: 'noa',
    interest: 'warm',
    intent: 'curious',
    painPoints: [],
    notes: '',
    source: 'seed',
    ...overrides,
  };
}

describe('normalizeName', () => {
  it('strips diacritics, honorifics, punctuation and initials', () => {
    const n = normalizeName('Dr. Sarah J. Chen');
    expect(n.full).toBe('sarah chen');
    expect(n.initials).toEqual(['j']);
    expect(n.first).toBe('sarah');
    expect(n.last).toBe('chen');
  });
  it('handles "Last, First"', () => {
    expect(normalizeName('Müller, Robert').full).toBe('robert muller');
  });
  it('expands nicknames and surname variants into the canonical form', () => {
    const a = normalizeName('Bob Mueller');
    const b = normalizeName('Robert Müller');
    expect(a.canonicalFull).toBe('robert muller');
    expect(b.canonicalFull).toBe('robert muller');
    expect(a.full).not.toBe(b.full);
  });
  it('handles Hebrew transliterations', () => {
    expect(normalizeName('Yonatan Levy').canonicalFull).toBe(normalizeName('Jonathan Levi').canonicalFull);
  });
});

describe('normalizeCompany', () => {
  it('strips legal suffixes and applies aliases', () => {
    expect(normalizeCompany('Adyen N.V.')).toBe('adyen');
    expect(normalizeCompany('The Worldpay Group Ltd')).toBe('worldpay');
    expect(normalizeCompany('FIS Worldpay')).toBe('worldpay');
    expect(normalizeCompany('Checkout.com')).toBe('checkout com');
    expect(normalizeCompany('J.P. Morgan')).toBe('jpmorgan');
    expect(normalizeCompany('Global Payments Inc.')).toBe('global payments');
  });
});

describe('identifiers', () => {
  it('normalizes emails, domains, phones and linkedin', () => {
    expect(normalizeEmail('Sarah.Chen+conf@Gmail.com')).toBe('sarahchen@gmail.com');
    expect(normalizeEmail('s.chen+x@adyen.com')).toBe('s.chen@adyen.com');
    expect(emailDomain('s.chen@adyen.com')).toBe('adyen.com');
    expect(emailDomain('someone@gmail.com')).toBe('');
    expect(companyFromDomain('mail.hotelbeds.com')).toBe('hotelbeds');
    expect(phoneKey('+44 (0)7700 900123')).toBe('700900123');
    expect(phoneKey('07700 900123')).toBe('700900123');
    expect(linkedinSlug('https://www.linkedin.com/in/sarah-chen-1a2b/')).toBe('sarah-chen-1a2b');
    expect(linkedinSlug('sarah-chen-1a2b')).toBe('sarah-chen-1a2b');
  });
});

describe('similarity', () => {
  it('jaroWinkler basics', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeGreaterThan(0.95);
    expect(jaroWinkler('sarah chen', 'sarah chen')).toBe(1);
    expect(jaroWinkler('abc', 'xyz')).toBe(0);
  });
  it('tokenSetRatio tolerates order and extra tokens', () => {
    expect(tokenSetRatio('maria garcia lopez', 'maria garcia')).toBe(1);
    expect(tokenSetRatio('chen sarah', 'sarah chen')).toBe(1);
  });
  it('companySimilarity handles containment', () => {
    expect(companySimilarity('adyen', 'adyen payments')).toBe(0.9);
    expect(companySimilarity('stripe', 'barclays')).toBeLessThan(0.6);
  });
});

describe('findCandidates cascade', () => {
  const sarah = contact({ id: 'sarah', canonicalName: 'Sarah Chen', currentCompany: 'Worldpay', emails: ['sarah.chen@worldpay.com'], aliases: ['S. Chen'] });
  const robert = contact({ id: 'robert', canonicalName: 'Robert Müller', currentCompany: 'Nuvei' });
  const yonatan = contact({ id: 'yonatan', canonicalName: 'Yonatan Levy', currentCompany: 'Rapyd' });
  const jamesStripe = contact({ id: 'js1', canonicalName: 'James Smith', currentCompany: 'Stripe' });
  const jamesBarclays = contact({ id: 'js2', canonicalName: 'James Smith', currentCompany: 'Barclays' });
  const jamesHsbc = contact({ id: 'js3', canonicalName: 'James Smith', currentCompany: 'HSBC' });
  const maria = contact({ id: 'maria', canonicalName: 'Maria Garcia Lopez', currentCompany: 'Hotelbeds', emails: ['mgarcia@hotelbeds.com'] });
  const omar = contact({ id: 'omar', canonicalName: 'Omar Haddad', currentCompany: 'PayTabs' });
  const contacts = [sarah, robert, yonatan, jamesStripe, jamesBarclays, jamesHsbc, maria, omar];
  const encounters: Encounter[] = [
    encounter({ contactId: 'sarah', name: 'Sarah Chen', company: 'Worldpay', capturedAt: '2025-10-27T10:00:00Z', email: 'sarah.chen@worldpay.com' }),
    encounter({ contactId: 'robert', name: 'Robert Müller', company: 'Nuvei', capturedAt: '2026-03-25T10:00:00Z' }),
    encounter({ contactId: 'yonatan', name: 'Yonatan Levy', company: 'Rapyd', capturedAt: '2026-03-25T10:00:00Z' }),
    encounter({ contactId: 'maria', name: 'Maria Garcia Lopez', company: 'Hotelbeds', capturedAt: '2026-03-25T10:00:00Z' }),
    encounter({ contactId: 'omar', name: 'Omar Haddad', company: 'PayTabs', title: 'VP Payments', capturedAt: '2026-05-01T10:00:00Z' }),
  ];

  it('email exact wins with confidence 1 even when name and company changed', () => {
    const [best] = findCandidates({ name: 'Sara Chen', company: 'Adyen', email: 'Sarah.Chen@worldpay.com' }, contacts, encounters);
    expect(best!.contact.id).toBe('sarah');
    expect(best!.confidence).toBe(1);
    expect(best!.reasons).toContain('Same email address');
  });

  it('exact name and company auto-links', () => {
    const [best] = findCandidates({ name: 'Sarah Chen', company: 'Worldpay Ltd' }, contacts, encounters);
    expect(best!.contact.id).toBe('sarah');
    expect(best!.confidence).toBeGreaterThanOrEqual(AUTO_LINK);
  });

  it('nickname plus diacritic variant lands in the ask band with an explanation', () => {
    const [best] = findCandidates({ name: 'Bob Mueller', company: 'Nuvei' }, contacts, encounters);
    expect(best!.contact.id).toBe('robert');
    expect(best!.confidence).toBeGreaterThanOrEqual(ASK);
    expect(best!.confidence).toBeLessThan(AUTO_LINK);
    expect(best!.flags).toContain('name-variant');
    expect(best!.reasons.join(' ')).toMatch(/Bob.*Robert/);
    expect(best!.reasons.join(' ')).toMatch(/Mueller.*Muller/i);
  });

  it('Hebrew transliteration lands in the ask band', () => {
    const [best] = findCandidates({ name: 'Jonathan Levi', company: 'Rapyd' }, contacts, encounters);
    expect(best!.contact.id).toBe('yonatan');
    expect(best!.flags).toContain('name-variant');
    expect(best!.confidence).toBeGreaterThanOrEqual(ASK);
    expect(best!.confidence).toBeLessThan(AUTO_LINK);
  });

  it('same name at a different company flags a possible job change, in the ask band', () => {
    const [best] = findCandidates({ name: 'Omar Haddad', company: 'WebBeds' }, contacts, encounters);
    expect(best!.contact.id).toBe('omar');
    expect(best!.flags).toContain('possible-job-change');
    expect(best!.confidence).toBeGreaterThanOrEqual(ASK);
    expect(best!.confidence).toBeLessThan(AUTO_LINK);
    expect(best!.reasons[0]).toMatch(/PayTabs.*WebBeds/i);
  });

  it('a common name with a new company never auto-links and is penalized', () => {
    const results = findCandidates({ name: 'James Smith', company: 'Revolut' }, contacts, encounters);
    for (const r of results) {
      expect(r.confidence).toBeLessThan(AUTO_LINK);
      expect(r.flags).toContain('common-name');
    }
    // Same name at Stripe still matches the Stripe James.
    const [stripe] = findCandidates({ name: 'James Smith', company: 'Stripe' }, contacts, encounters);
    expect(stripe!.contact.id).toBe('js1');
    expect(stripe!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('compound surname with a company email domain auto-links', () => {
    const [best] = findCandidates({ name: 'Maria Garcia', email: 'maria.garcia@hotelbeds.com' }, contacts, encounters);
    expect(best!.contact.id).toBe('maria');
    expect(best!.confidence).toBeGreaterThanOrEqual(AUTO_LINK);
  });

  it('an initial-only name with company asks rather than auto-linking', () => {
    const [best] = findCandidates({ name: 'S. Chen', company: 'Worldpay' }, contacts, encounters);
    expect(best!.contact.id).toBe('sarah');
    expect(best!.confidence).toBeGreaterThanOrEqual(ASK);
    expect(best!.confidence).toBeLessThan(AUTO_LINK);
  });

  it('a stranger returns nothing', () => {
    expect(findCandidates({ name: 'Priya Raman', company: 'Airwallex' }, contacts, encounters)).toHaveLength(0);
  });

  it('a surname alone never links', () => {
    expect(findCandidates({ name: 'Chen', company: 'Worldpay' }, contacts, encounters)).toHaveLength(0);
  });

  it('a shared surname with a different first name at the same company never auto-links', () => {
    const results = findCandidates({ name: 'David Chen', company: 'Worldpay' }, contacts, encounters);
    for (const r of results) expect(r.confidence).toBeLessThan(AUTO_LINK);
    const yon = findCandidates({ name: 'David Levy', company: 'Rapyd' }, contacts, encounters);
    for (const r of yon) expect(r.confidence).toBeLessThan(AUTO_LINK);
  });

  it('a small typo in the first name still auto-links with the company', () => {
    const [best] = findCandidates({ name: 'Sara Chen', company: 'Worldpay' }, contacts, encounters);
    expect(best!.contact.id).toBe('sarah');
    expect(best!.confidence).toBeGreaterThanOrEqual(AUTO_LINK);
  });
});

describe('seniorityLevel', () => {
  it('maps titles', () => {
    expect(seniorityLevel('Analyst, Treasury')).toBe(1);
    expect(seniorityLevel('Senior Treasury Analyst')).toBe(2);
    expect(seniorityLevel('Head of Treasury')).toBe(3);
    expect(seniorityLevel('VP Payments')).toBe(4);
    expect(seniorityLevel('Group Treasurer')).toBe(5);
    expect(seniorityLevel('CFO')).toBe(5);
    expect(seniorityLevel('Wizard')).toBeUndefined();
  });
});

describe('classifyArc', () => {
  const names = (id: string) => ({ m1: 'Money20/20 USA 2025', p1: 'Pay360 2026', s1: 'Sibos 2026', n1: 'Fintech Nexus 2025', e1: 'Money20/20 Europe 2026' })[id] ?? id;
  const ctx = { now: '2026-09-24', conferenceName: names };

  it('single encounter is new', () => {
    const c = contact({ id: 'x', canonicalName: 'X', currentCompany: 'Y' });
    const arc = classifyArc(c, [encounter({ contactId: 'x', name: 'X', company: 'Y', capturedAt: '2026-06-01T10:00:00Z', conferenceId: 'e1' })], ctx);
    expect(arc.classification).toBe('new');
    expect(arc.signals[0]).toContain('Met once');
  });

  it('job change with seniority up', () => {
    const c = contact({ id: 'sarah', canonicalName: 'Sarah Chen', currentCompany: 'Adyen' });
    const es = [
      encounter({ contactId: 'sarah', name: 'Sarah Chen', company: 'Worldpay', title: 'Treasury Analyst', capturedAt: '2025-10-27T10:00:00Z', conferenceId: 'm1', intent: 'curious' }),
      encounter({ contactId: 'sarah', name: 'S. Chen', company: 'Worldpay', title: 'Senior Treasury Analyst', capturedAt: '2026-03-25T10:00:00Z', conferenceId: 'p1', intent: 'evaluating', nextStep: 'Send deck', nextStepDone: true }),
      encounter({ contactId: 'sarah', name: 'Sara Chen', company: 'Adyen', title: 'Head of Treasury', capturedAt: '2026-09-20T10:00:00Z', conferenceId: 's1', intent: 'budget', interest: 'hot' }),
    ];
    const arc = classifyArc(c, es, ctx);
    expect(arc.classification).toBe('job-change');
    expect(arc.companyChanged).toBe(true);
    expect(arc.seniorityDelta).toBe(2);
    expect(arc.intentTrend).toBe('up');
    expect(arc.signals).toContain('Moved: Worldpay → Adyen');
    expect(arc.signals).toContain('Seniority up: Treasury Analyst → Head of Treasury');
    expect(arc.signals).toContain('Intent rising: curious → budget');
  });

  it('tire-kicker: three touches over a year, never past curious, no next steps', () => {
    const c = contact({ id: 'priya', canonicalName: 'Priya Raman', currentCompany: 'Airwallex' });
    const es = ['2025-05-15', '2026-06-03', '2026-09-30'].map((d, i) =>
      encounter({ contactId: 'priya', name: 'Priya Raman', company: 'Airwallex', title: 'Payments Manager', capturedAt: d + 'T10:00:00Z', conferenceId: ['n1', 'e1', 's1'][i]!, intent: 'curious' }),
    );
    const arc = classifyArc(c, es, { ...ctx, now: '2026-10-05' });
    expect(arc.classification).toBe('tire-kicker');
    expect(arc.touches).toBe(3);
    expect(arc.spanMonths).toBeGreaterThan(15);
    expect(arc.signals).toContain('Never past "curious" in 3 meetings');
    expect(arc.signals).toContain('No next step ever agreed');
  });

  it('warming when a next step was completed', () => {
    const c = contact({ id: 'w', canonicalName: 'W', currentCompany: 'Co' });
    const es = [
      encounter({ contactId: 'w', name: 'W', company: 'Co', title: 'Manager', capturedAt: '2026-03-25T10:00:00Z', conferenceId: 'p1', nextStep: 'Book demo', nextStepDone: true }),
      encounter({ contactId: 'w', name: 'W', company: 'Co', title: 'Manager', capturedAt: '2026-06-03T10:00:00Z', conferenceId: 'e1', interest: 'hot' }),
    ];
    const arc = classifyArc(c, es, ctx);
    expect(arc.classification).toBe('warming');
    expect(arc.confidence).toBe(0.85);
    expect(arc.signals).toContain('1 of 1 next steps completed');
  });

  it('stalled when nothing moved', () => {
    const c = contact({ id: 's', canonicalName: 'S', currentCompany: 'Co' });
    const es = [
      encounter({ contactId: 's', name: 'S', company: 'Co', title: 'Manager', capturedAt: '2026-03-25T10:00:00Z', conferenceId: 'p1', intent: 'evaluating', nextStep: 'Send deck' }),
      encounter({ contactId: 's', name: 'S', company: 'Co', title: 'Manager', capturedAt: '2026-06-03T10:00:00Z', conferenceId: 'e1', intent: 'evaluating' }),
    ];
    const arc = classifyArc(c, es, ctx);
    expect(arc.classification).toBe('stalled');
    expect(arc.signals).toContain('1 next step agreed, none completed');
  });
});
