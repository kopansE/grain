import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleHubspot } from './_lib/hubspot.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const out = await handleHubspot({ body: req.body, headers: req.headers, env: process.env });
  return res.status(out.status).json(out.body);
}
