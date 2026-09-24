import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { devApiPlugin } from './api/_lib/dev-plugin.ts';

/**
 * Secrets for the dev API proxy. Vite's own loadEnv lets machine-level
 * process.env values override the project's .env files, which bites when a
 * developer has an old ANTHROPIC_API_KEY set globally. Here the project files
 * win: .env, then .env.local, then process.env only for keys the files lack.
 * Nothing loaded here reaches the browser bundle.
 */
function readServerEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      if (value) out[key] = value;
    }
  }
  for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'HUBSPOT_ACCESS_TOKEN']) {
    if (!out[key] && process.env[key]) out[key] = process.env[key];
  }
  return out;
}

export default defineConfig(() => {
  const env = readServerEnv();
  return {
    plugins: [
      react(),
      tailwindcss(),
      devApiPlugin(env),
      // Installable on a phone; the app shell and textures work offline, the API never gets cached.
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,webmanifest}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }],
        },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/node_modules[\\/](three|three-globe|globe\.gl|react-globe\.gl)[\\/]/.test(id)) return 'globe';
            if (/node_modules[\\/](recharts|d3-[a-z-]+|victory-vendor)[\\/]/.test(id)) return 'charts';
            if (/node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/.test(id)) return 'motion';
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    },
  };
});
