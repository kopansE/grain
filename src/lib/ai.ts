import { useSettings } from '@/store/settings';
import type { ArcAi, DiscoverResult, FollowUp, Lead, PreBrief } from '@api/_lib/features.ts';

export type { ArcAi, DiscoverResult, FollowUp, Lead, PreBrief };

export type AiFeature = 'ping' | 'extractLead' | 'extractCard' | 'arcSummary' | 'followUp' | 'preBrief' | 'discover';

export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface AiResult<T> {
  data: T;
  /** True when the answer came from the bundled demo responses, not the model. */
  demo: boolean;
}

/** Whether a live model is reachable: the user pasted a key, or the host has one. */
export function aiIsLive(): boolean {
  const s = useSettings.getState();
  return s.anthropicKey.trim().length > 0 || s.hostHasAnthropicKey;
}

/**
 * Single entry point for every AI feature. When no key is available and a
 * demo answer exists, the demo answer is returned with `demo: true`, so the
 * live URL is never dead. Otherwise the request goes to /api/ai.
 */
export async function callAi<T>(feature: AiFeature, payload: unknown, demo?: () => T | undefined): Promise<AiResult<T>> {
  await bootstrapAiStatus();
  const s = useSettings.getState();
  const key = s.anthropicKey.trim();
  if (!key && !s.hostHasAnthropicKey) {
    const d = demo?.();
    if (d !== undefined) return { data: d, demo: true };
    throw new AiError('no_key', 'Add an Anthropic API key in Settings to use this.');
  }
  let res: Response;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { 'x-anthropic-key': key } : {}) },
      body: JSON.stringify({ feature, payload, model: s.model }),
    });
  } catch {
    const d = demo?.();
    if (d !== undefined) return { data: d, demo: true };
    throw new AiError('offline', 'No connection. Saved as typed; AI can run later.');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    if (json.error === 'no_key') {
      useSettings.getState().update({ hostHasAnthropicKey: false });
      const d = demo?.();
      if (d !== undefined) return { data: d, demo: true };
    }
    throw new AiError(json.error ?? 'error', json.message ?? `AI request failed (${res.status}).`);
  }
  return { data: json as T, demo: false };
}

export interface PingResult {
  ok: boolean;
  model?: string;
  displayName?: string;
  usingHostKey?: boolean;
  message?: string;
}

/** Cheap connectivity check. Also records whether the host has a fallback key. */
export async function pingAi(userKey?: string): Promise<PingResult> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(userKey ? { 'x-anthropic-key': userKey } : {}) },
      body: JSON.stringify({ feature: 'ping', model: useSettings.getState().model }),
    });
    const json = (await res.json().catch(() => ({}))) as PingResult & { error?: string };
    if (!res.ok || !json.ok) return { ok: false, message: json.message ?? `HTTP ${res.status}` };
    if (!userKey) useSettings.getState().update({ hostHasAnthropicKey: !!json.usingHostKey });
    return { ok: true, model: json.model, displayName: json.displayName, usingHostKey: json.usingHostKey };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not reach the server.' };
  }
}

let bootstrapped: Promise<void> | undefined;
/** Once per session: if the user has no key, ask the server whether the host has one. */
export function bootstrapAiStatus(): Promise<void> {
  if (bootstrapped) return bootstrapped;
  bootstrapped = (async () => {
    const s = useSettings.getState();
    if (s.anthropicKey.trim()) return;
    try {
      const cached = sessionStorage.getItem('orbit.ai.host');
      if (cached !== null) {
        s.update({ hostHasAnthropicKey: cached === '1' });
        return;
      }
    } catch {
      /* private mode */
    }
    const r = await pingAi();
    const has = !!(r.ok && r.usingHostKey);
    try {
      sessionStorage.setItem('orbit.ai.host', has ? '1' : '0');
    } catch {
      /* ignore */
    }
  })();
  return bootstrapped;
}
