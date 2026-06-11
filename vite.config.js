import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is '/' for local + custom-domain; the deploy workflow sets VITE_BASE
// to the GitHub Pages project path (e.g. '/spirit-vale-map/').
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
