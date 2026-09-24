import { fail, header, type ProxyRequest, type ProxyResponse } from './types.js';

/**
 * Thin forwarder to the HubSpot API. Exists only because HubSpot does not
 * allow browser-side calls (no CORS). The caller's token is used verbatim;
 * nothing is stored server-side.
 */
const HUBSPOT_BASE = 'https://api.hubapi.com';
const ALLOWED_PREFIXES = ['/crm/v3/', '/crm/v4/', '/oauth/v1/access-tokens/', '/account-info/v3/'];

interface HubspotRequestBody {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'PING';
  path?: string;
  body?: unknown;
}

export function resolveHubspotToken(req: ProxyRequest): string | undefined {
  return header(req.headers, 'x-hubspot-token') || req.env.HUBSPOT_ACCESS_TOKEN || undefined;
}

export async function handleHubspot(req: ProxyRequest): Promise<ProxyResponse> {
  const token = resolveHubspotToken(req);
  const body = (req.body ?? {}) as HubspotRequestBody;

  // Connectivity check that never produces a 4xx (so the browser console stays clean on hosts without a token).
  if (body.method === 'PING') {
    if (!token) return { status: 200, body: { ok: false, error: 'no_token', message: 'No HubSpot token. Add a Private App token in Settings.' } };
    try {
      const r = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts?limit=1`, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
      if (r.ok) return { status: 200, body: { ok: true, usingHostToken: !header(req.headers, 'x-hubspot-token') } };
      const j = (await r.json().catch(() => ({}))) as { message?: string };
      return { status: 200, body: { ok: false, error: r.status === 401 ? 'bad_token' : r.status === 403 ? 'missing_scope' : 'api_error', message: r.status === 401 ? 'HubSpot rejected the token.' : (j.message ?? `HubSpot returned ${r.status}.`) } };
    } catch (e) {
      return { status: 200, body: { ok: false, error: 'upstream_unreachable', message: e instanceof Error ? e.message : 'Could not reach HubSpot.' } };
    }
  }

  if (!token) return fail(401, 'no_token', 'No HubSpot token. Add a Private App token in Settings.');
  const path = body.path ?? '';
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return fail(400, 'path_not_allowed', 'That HubSpot endpoint is not allowed through this proxy.');
  }

  const method = body.method ?? 'GET';
  try {
    const r = await fetch(HUBSPOT_BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: method === 'GET' ? undefined : JSON.stringify(body.body ?? {}),
    });
    const text = await r.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: r.status, body: json };
  } catch (e) {
    return fail(502, 'upstream_unreachable', e instanceof Error ? e.message : 'Could not reach HubSpot.');
  }
}
