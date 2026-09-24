import Anthropic from '@anthropic-ai/sdk';
import { fail, header, type ProxyRequest, type ProxyResponse } from './types.ts';

export const DEFAULT_MODEL = 'claude-opus-5';

/** Keys are resolved per request: the user's key from Settings wins, then the host's env fallback. */
export function resolveAnthropicKey(req: ProxyRequest): string | undefined {
  return header(req.headers, 'x-anthropic-key') || req.env.ANTHROPIC_API_KEY || undefined;
}

interface AiRequestBody {
  feature?: string;
  payload?: unknown;
  model?: string;
}

export async function handleAi(req: ProxyRequest): Promise<ProxyResponse> {
  const body = (req.body ?? {}) as AiRequestBody;
  const apiKey = resolveAnthropicKey(req);
  if (!apiKey) return fail(401, 'no_key', 'No Anthropic API key. Add one in Settings to enable live AI.');

  const model = body.model || req.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  try {
    switch (body.feature) {
      case 'ping': {
        // Cheapest possible round-trip: no tokens are consumed.
        const m = await client.models.retrieve(model);
        return { status: 200, body: { ok: true, model: m.id, displayName: m.display_name } };
      }
      default:
        return fail(400, 'unknown_feature', `Unknown AI feature "${body.feature ?? ''}".`);
    }
  } catch (e) {
    return mapAnthropicError(e);
  }
}

export function mapAnthropicError(e: unknown): ProxyResponse {
  if (e instanceof Anthropic.AuthenticationError) return fail(401, 'bad_key', 'Anthropic rejected this API key.');
  if (e instanceof Anthropic.PermissionDeniedError) return fail(403, 'forbidden', 'This key is not allowed to use that model.');
  if (e instanceof Anthropic.NotFoundError) return fail(404, 'not_found', 'Model not found. Check the model name in Settings.');
  if (e instanceof Anthropic.RateLimitError) return fail(429, 'rate_limited', 'Anthropic rate limit hit. Try again in a moment.');
  if (e instanceof Anthropic.APIConnectionError) return fail(502, 'upstream_unreachable', 'Could not reach Anthropic.');
  if (e instanceof Anthropic.APIError) return fail(e.status ?? 500, 'api_error', e.message);
  return fail(500, 'unknown', e instanceof Error ? e.message : 'Unknown error');
}
