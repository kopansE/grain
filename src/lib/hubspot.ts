import { useSettings } from '@/store/settings';
import { useData } from '@/store/data';
import type { Contact, Encounter } from '@/domain/types';
import { NOTE_TO_CONTACT_ASSOCIATION, contactProps, noteProps, toHubspotCsv } from '@/domain/hubspot/mapping';

export class HubspotError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'HubspotError';
  }
}

export function hubspotIsLive(): boolean {
  const s = useSettings.getState();
  return s.hubspotToken.trim().length > 0 || s.hostHasHubspotToken;
}

/** Calls the HubSpot API through the proxy with the user's token (or the host's fallback). */
export async function hubspotRequest<T = unknown>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown, tokenOverride?: string): Promise<T> {
  const s = useSettings.getState();
  const token = (tokenOverride ?? s.hubspotToken).trim();
  let res: Response;
  try {
    res = await fetch('/api/hubspot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { 'x-hubspot-token': token } : {}) },
      body: JSON.stringify({ method, path, body }),
    });
  } catch {
    throw new HubspotError('offline', 'No connection. The lead is saved locally; push it later.');
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = String(json.error ?? json.category ?? 'error');
    const message =
      code === 'no_token'
        ? 'No HubSpot token. Add a Private App token in Settings.'
        : res.status === 401
          ? 'HubSpot rejected the token. Check it in Settings.'
          : res.status === 403
            ? `The token is missing a scope. ${String(json.message ?? '')}`.trim()
            : String(json.message ?? `HubSpot request failed (${res.status}).`);
    throw new HubspotError(code, message, res.status);
  }
  return json as T;
}

export interface HubspotPing {
  ok: boolean;
  message?: string;
  usingHostToken?: boolean;
}

export async function pingHubspot(tokenOverride?: string): Promise<HubspotPing> {
  const s = useSettings.getState();
  const token = (tokenOverride ?? s.hubspotToken).trim();
  try {
    const res = await fetch('/api/hubspot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { 'x-hubspot-token': token } : {}) },
      body: JSON.stringify({ method: 'PING' }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; usingHostToken?: boolean };
    if (!token) useSettings.getState().update({ hostHasHubspotToken: !!json.ok });
    return json.ok ? { ok: true, usingHostToken: !!json.usingHostToken } : { ok: false, message: json.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not reach the server.' };
  }
}

let bootstrapped: Promise<void> | undefined;
/** Once per session: if the user has no token, ask the server whether the host has one. */
export function bootstrapHubspotStatus(): Promise<void> {
  if (bootstrapped) return bootstrapped;
  bootstrapped = (async () => {
    const s = useSettings.getState();
    if (s.hubspotToken.trim()) return;
    try {
      const cached = sessionStorage.getItem('orbit.hubspot.host');
      if (cached !== null) {
        s.update({ hostHasHubspotToken: cached === '1' });
        return;
      }
    } catch {
      /* private mode */
    }
    const r = await pingHubspot();
    try {
      sessionStorage.setItem('orbit.hubspot.host', r.ok ? '1' : '0');
    } catch {
      /* ignore */
    }
  })();
  return bootstrapped;
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------
interface SearchResponse {
  total: number;
  results: { id: string; properties: Record<string, string | null> }[];
}
interface ObjectResponse {
  id: string;
}

async function findContactId(props: ReturnType<typeof contactProps>): Promise<string | undefined> {
  const filters = props.email
    ? [{ propertyName: 'email', operator: 'EQ', value: props.email }]
    : [
        { propertyName: 'firstname', operator: 'EQ', value: props.firstname },
        { propertyName: 'lastname', operator: 'EQ', value: props.lastname },
        ...(props.company ? [{ propertyName: 'company', operator: 'EQ', value: props.company }] : []),
      ];
  const res = await hubspotRequest<SearchResponse>('POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters }],
    properties: ['email', 'firstname', 'lastname', 'company'],
    limit: 1,
  });
  return res.results[0]?.id;
}

export interface PushPlan {
  contactProps: ReturnType<typeof contactProps>;
  note: ReturnType<typeof noteProps>;
}

/** What would be sent, for the preview. */
export function planPush(encounter: Encounter, contact: Contact, conferenceName: string, repName?: string, arcLine?: string): PushPlan {
  return { contactProps: contactProps(contact, encounter), note: noteProps(encounter, conferenceName, repName, arcLine) };
}

export interface PushResult {
  contactId: string;
  noteId: string;
  created: boolean;
}

/**
 * Upsert the contact (by email, else by name and company), then attach a
 * note for this meeting. Records the outcome on the encounter either way.
 */
export async function pushEncounter(encounter: Encounter, contact: Contact, conferenceName: string, repName?: string, arcLine?: string): Promise<PushResult> {
  const data = useData.getState();
  const plan = planPush(encounter, contact, conferenceName, repName, arcLine);
  try {
    let contactId = contact.hubspotContactId;
    let created = false;
    if (!contactId) contactId = await findContactId(plan.contactProps);
    if (contactId) {
      await hubspotRequest<ObjectResponse>('PATCH', `/crm/v3/objects/contacts/${contactId}`, { properties: plan.contactProps });
    } else {
      const c = await hubspotRequest<ObjectResponse>('POST', '/crm/v3/objects/contacts', { properties: plan.contactProps });
      contactId = c.id;
      created = true;
    }
    const n = await hubspotRequest<ObjectResponse>('POST', '/crm/v3/objects/notes', {
      properties: plan.note,
      associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: NOTE_TO_CONTACT_ASSOCIATION }] }],
    });
    data.setHubspotSync(encounter.id, { status: 'synced', contactId, noteId: n.id, pushedAt: new Date().toISOString() }, contactId);
    return { contactId, noteId: n.id, created };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Push failed.';
    data.setHubspotSync(encounter.id, { status: 'failed', error: message, contactId: contact.hubspotContactId });
    throw e;
  }
}

/** Download a CSV HubSpot's importer accepts. The path that exists before IT hands over a token. */
export function downloadHubspotCsv(rows: { encounter: Encounter; contact: Contact; conferenceName: string }[], filename = 'grain-orbit-leads.csv') {
  const csv = toHubspotCsv(rows);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
