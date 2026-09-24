import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };
import { createManifest } from './src/manifest.ts';

function emitManifest(): Plugin {
  return {
    name: 'emit-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(createManifest(pkg.version), null, 2),
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), emitManifest()],
  // Library mode does not replace process.env, which React relies on.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'development' ? 'inline' : false,
    minify: mode !== 'development',
    // Content scripts cannot be ES modules, so bundle as a single IIFE.
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/index.tsx'),
      name: 'GitHubPrReviewContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
}));
