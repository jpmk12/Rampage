import { defineConfig } from 'vite';

// base: './' makes the build work from any subpath (e.g. GitHub Pages)
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
