import Anthropic from '@anthropic-ai/sdk';
import { fail, header, type ProxyRequest, type ProxyResponse } from './types.js';
import { arcSummary, discover, extractCard, extractLead, followUp, preBrief, type AiCtx } from './features.js';

export const DEFAULT_MODEL = 'claude-sonnet-5';

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
  const usingHostKey = !header(req.headers, 'x-anthropic-key') && !!req.env.ANTHROPIC_API_KEY;
  // The ping never 4xxs, so a host without a key does not log console errors on every page load.
  if (!apiKey && body.feature === 'ping') return { status: 200, body: { ok: false, error: 'no_key', message: 'No Anthropic API key. Add one in Settings to enable live AI.' } };
  if (!apiKey) return fail(401, 'no_key', 'No Anthropic API key. Add one in Settings to enable live AI.');

  const model = body.model || req.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  // Discovery streams a web-search turn and can legitimately run for a while; everything else is quick.
  const client = body.feature === 'discover' ? new Anthropic({ apiKey, timeout: 110_000, maxRetries: 0 }) : new Anthropic({ apiKey, timeout: 55_000, maxRetries: 1 });
  const ctx: AiCtx = { client, model };

  try {
    switch (body.feature) {
      case 'ping': {
        // Cheapest possible round-trip: no tokens are consumed.
        try {
          const m = await client.models.retrieve(model);
          return { status: 200, body: { ok: true, model: m.id, displayName: m.display_name, usingHostKey } };
        } catch (e) {
          const mapped = mapAnthropicError(e);
          return { status: 200, body: { ok: false, ...(mapped.body as object) } };
        }
      }
      case 'extractLead':
        return { status: 200, body: await extractLead(ctx, body.payload) };
      case 'extractCard':
        return { status: 200, body: await extractCard(ctx, body.payload) };
      case 'arcSummary':
        return { status: 200, body: await arcSummary(ctx, body.payload) };
      case 'followUp':
        return { status: 200, body: await followUp(ctx, body.payload) };
      case 'preBrief':
        return { status: 200, body: await preBrief(ctx, body.payload) };
      case 'discover':
        return { status: 200, body: await discover(ctx, body.payload) };
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
  if (e instanceof Anthropic.BadRequestError) return fail(400, 'bad_request', e.message);
  if (e instanceof Anthropic.APIConnectionTimeoutError) return fail(504, 'timeout', 'The AI request took too long. Try again.');
  if (e instanceof Anthropic.APIConnectionError) return fail(502, 'upstream_unreachable', 'Could not reach Anthropic.');
  if (e instanceof Anthropic.APIError) return fail(e.status ?? 500, 'api_error', e.message);
  // zod validation of our own payloads, or a null parsed_output
  return fail(422, 'invalid', e instanceof Error ? e.message : 'Unknown error');
}
