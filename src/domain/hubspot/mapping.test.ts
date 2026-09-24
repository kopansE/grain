import { describe, expect, it } from 'vitest';
import { contactProps, noteBody, splitName, toHubspotCsv } from './mapping';
import type { Contact, Encounter } from '../types';

const contact: Contact = {
  id: 'c1',
  canonicalName: 'Maria Garcia Lopez',
  aliases: ['Maria Garcia Lopez', 'Maria Garcia'],
  emails: ['mgarcia@hotelbeds.com'],
  phones: [],
  currentCompany: 'Hotelbeds',
  currentTitle: 'Head of Treasury',
  encounterIds: ['e1'],
};
const e: Encounter = {
  id: 'e1',
  contactId: 'c1',
  conferenceId: 'x',
  repId: 'noa',
  capturedAt: '2026-09-16T10:00:00Z',
  name: 'Maria Garcia',
  company: 'Hotelbeds',
  title: 'Head of Treasury',
  interest: 'hot',
  intent: 'budget',
  painPoints: ['Guaranteed local pricing'],
  notes: 'Pilot scope: EUR, USD, GBP, MXN. Said "let\'s go", then laughed.',
  nextStep: 'Send pricing',
  source: 'voice',
};

describe('hubspot mapping', () => {
  it('splits names with compound surnames on the last token', () => {
    expect(splitName('Maria Garcia Lopez')).toEqual({ firstname: 'Maria Garcia', lastname: 'Lopez' });
    expect(splitName('Prince')).toEqual({ firstname: 'Prince', lastname: '' });
  });
  it('builds contact properties from the contact and the latest meeting', () => {
    const p = contactProps(contact, e);
    expect(p.email).toBe('mgarcia@hotelbeds.com');
    expect(p.company).toBe('Hotelbeds');
    expect(p.jobtitle).toBe('Head of Treasury');
    expect(p.phone).toBeUndefined();
  });
  it('writes a readable note', () => {
    const n = noteBody(e, 'EuroFinance 2026', 'Noa', 'warming');
    expect(n).toContain('Met at EuroFinance 2026 on 2026-09-16 (Noa)');
    expect(n).toContain('Next step: Send pricing');
    expect(n).toContain('Relationship: warming');
  });
  it('produces CSV that escapes quotes and commas', () => {
    const csv = toHubspotCsv([{ encounter: e, contact, conferenceName: 'EuroFinance 2026' }]);
    const [header, row] = csv.split('\n');
    expect(header!.startsWith('First Name,Last Name,Email')).toBe(true);
    expect(row).toContain('"Pilot scope: EUR, USD, GBP, MXN. Said ""let\'s go"", then laughed."');
  });
});
