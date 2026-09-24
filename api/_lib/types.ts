/**
 * Shared shapes for the two proxy functions. The same handlers run on Vercel
 * (api/ai.ts, api/hubspot.ts) and inside the Vite dev server (dev-plugin.ts),
 * so they take a plain request object instead of a framework request.
 */
export interface ProxyRequest {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  /** Server-side fallback secrets. On Vercel this is process.env; in dev it is .env.local. */
  env: Record<string, string | undefined>;
}

export interface ProxyResponse {
  status: number;
  body: unknown;
}

export function header(headers: ProxyRequest['headers'], name: string): string | undefined {
  const v = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

export function fail(status: number, error: string, message: string): ProxyResponse {
  return { status, body: { error, message } };
}
