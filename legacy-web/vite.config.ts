import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Electron loads the production build through file://, so assets must be relative.
  base: './',
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { output: { manualChunks: { notation: ['katex'] } } } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
