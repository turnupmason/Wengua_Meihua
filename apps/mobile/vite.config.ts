import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(here, '../..');

export default defineConfig({
  // Relative base so the same build works from Capacitor's local server and any static host.
  base: './',
  plugins: [react()],
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
  },
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
  },
});
