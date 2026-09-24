import type { Contact, Encounter } from '../types';

/**
 * How a captured meeting becomes HubSpot objects. Kept pure so it can be
 * previewed in the UI before anything is sent, and unit-tested.
 */

export interface HubspotContactProps {
  email?: string;
  firstname: string;
  lastname: string;
  company?: string;
  jobtitle?: string;
  phone?: string;
  website?: string;
  [key: string]: string | undefined;
}

export function splitName(full: string): { firstname: string; lastname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0]!, lastname: '' };
  return { firstname: parts.slice(0, -1).join(' '), lastname: parts[parts.length - 1]! };
}

export function contactProps(contact: Contact, latest: Encounter): HubspotContactProps {
  const { firstname, lastname } = splitName(contact.canonicalName || latest.name);
  const props: HubspotContactProps = { firstname, lastname };
  const email = latest.email ?? contact.emails[0];
  if (email) props.email = email.trim().toLowerCase();
  if (latest.company || contact.currentCompany) props.company = latest.company || contact.currentCompany;
  if (latest.title ?? contact.currentTitle) props.jobtitle = latest.title ?? contact.currentTitle;
  const phone = latest.phone ?? contact.phones[0];
  if (phone) props.phone = phone;
  const li = latest.linkedin ?? contact.linkedin;
  if (li) props.website = li.startsWith('http') ? li : `https://www.linkedin.com/in/${li}`;
  return props;
}

export function noteBody(e: Encounter, conferenceName: string, repName?: string, arcLine?: string): string {
  const lines = [
    `Met at ${conferenceName} on ${e.capturedAt.slice(0, 10)}${repName ? ` (${repName})` : ''}.`,
    `${e.title ? `${e.title}, ` : ''}${e.company}.`,
    `Interest: ${e.interest}. Stage: ${e.intent}.`,
    e.painPoints.length ? `Pain: ${e.painPoints.join(', ')}.` : '',
    e.nextStep ? `Next step: ${e.nextStep}${e.nextStepDone ? ' (done)' : ''}.` : 'No next step agreed.',
    e.notes ? `\nNotes: ${e.notes}` : '',
    arcLine ? `\nRelationship: ${arcLine}` : '',
    `\nCaptured with Grain Orbit (${e.source}).`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function noteProps(e: Encounter, conferenceName: string, repName?: string, arcLine?: string): { hs_timestamp: string; hs_note_body: string } {
  return { hs_timestamp: e.capturedAt, hs_note_body: noteBody(e, conferenceName, repName, arcLine) };
}

/** Note → Contact association, HubSpot-defined type id. */
export const NOTE_TO_CONTACT_ASSOCIATION = 202;

const CSV_HEADERS = ['First Name', 'Last Name', 'Email', 'Company', 'Job Title', 'Phone Number', 'Website URL', 'Conference', 'Met On', 'Interest', 'Stage', 'Pain Points', 'Next Step', 'Notes'];

function csvCell(v: string | undefined): string {
  const s = (v ?? '').replace(/\r?\n/g, ' ');
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A file HubSpot's contact importer accepts as-is (map columns on import). */
export function toHubspotCsv(rows: { encounter: Encounter; contact: Contact; conferenceName: string }[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const { encounter: e, contact, conferenceName } of rows) {
    const p = contactProps(contact, e);
    lines.push(
      [p.firstname, p.lastname, p.email, p.company, p.jobtitle, p.phone, p.website, conferenceName, e.capturedAt.slice(0, 10), e.interest, e.intent, e.painPoints.join('; '), e.nextStep, e.notes]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}
