import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import { handleAi } from './ai.js';
import { handleHubspot } from './hubspot.js';
import type { ProxyRequest } from './types.js';

/**
 * Mounts the same handlers Vercel runs, inside `vite dev`, so local
 * development needs no extra tooling. `env` is the content of .env.local.
 */
export function devApiPlugin(env: Record<string, string | undefined>): Plugin {
  return {
    name: 'orbit-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();
        const route = url.split('?')[0];
        const handler = route === '/api/ai' ? handleAi : route === '/api/hubspot' ? handleHubspot : null;
        if (!handler) return next();
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        try {
          const body = await readJson(req);
          const out = await handler({ body, headers: req.headers as ProxyRequest['headers'], env });
          res.statusCode = out.status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(out.body));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'dev_proxy_error', message: e instanceof Error ? e.message : String(e) }));
        }
      });
    },
  };
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
