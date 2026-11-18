import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { readFile } from 'node:fs/promises';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(here, '../..');

/**
 * /api/reading in development: the same handler the Cloudflare Worker runs (server/reading.ts),
 * reading the 断语 from this checkout and asking the real Supabase project what the signed-in
 * account may read (so the plans apply here too).
 */
function readingApi(mode: string): Plugin {
  const env = loadEnv(mode, here, 'VITE_');
  const readJSON = async (path: string) => {
    const full = resolve(repoRoot, path);
    if (!/^(data|sources)\/[A-Za-z0-9/_.-]+\.json$/.test(path) || !full.startsWith(repoRoot + sep)) throw new Error('bad path');
    return JSON.parse(await readFile(full, 'utf8'));
  };
  return {
    name: 'wengua-reading-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/reading', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const { handleReadingRequest } = (await server.ssrLoadModule('/server/reading.ts')) as typeof import('./server/reading');
        const answer = await handleReadingRequest(
          { method: req.method ?? 'GET', authorization: (req.headers.authorization as string | undefined) ?? null, json: async () => JSON.parse(Buffer.concat(chunks).toString('utf8')) },
          { supabaseUrl: env.VITE_SUPABASE_URL ?? '', supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? '', readJSON },
        );
        res.statusCode = answer.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(answer.body));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Relative base so the same build works from Capacitor's local server and any static host.
  base: './',
  plugins: [react(), readingApi(mode)],
  resolve: {
    alias: {
      // The UI imports the repository's knowledge module directly; no algorithm is copied into the app.
      '@knowledge': resolve(repoRoot, 'src/index.js'),
    },
  },
  // Pre-bundle everything the lazily loaded 3D scene needs, so the first visit never hits a stale cache.
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
      'three/examples/jsm/objects/MarchingCubes.js',
      '@react-three/fiber',
      'lunar-javascript',
    ],
  },
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
    // Not reachable through a tunnel: the dev server can read the whole repository (the 断语
    // included). A phone check uses the built app (vite preview), which carries none of them.
  },
  preview: { allowedHosts: ['.trycloudflare.com'] },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    testTimeout: 30000,
    // Tests never reach the online services, whatever a local .env holds.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_REVENUECAT_IOS_KEY: '', VITE_GOOGLE_IOS_CLIENT_ID: '', VITE_GOOGLE_WEB_CLIENT_ID: '' },
  },
}));
