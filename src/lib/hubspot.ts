import { useSettings } from '@/store/settings';

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
            ? 'The token is missing a scope. Add contact read/write scopes to the private app.'
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
  try {
    await hubspotRequest('GET', '/crm/v3/objects/contacts?limit=1', undefined, tokenOverride);
    const s = useSettings.getState();
    const usingHostToken = !(tokenOverride ?? s.hubspotToken).trim();
    if (usingHostToken) s.update({ hostHasHubspotToken: true });
    return { ok: true, usingHostToken };
  } catch (e) {
    if (e instanceof HubspotError && e.code === 'no_token') useSettings.getState().update({ hostHasHubspotToken: false });
    return { ok: false, message: e instanceof Error ? e.message : 'Could not reach HubSpot.' };
  }
}
