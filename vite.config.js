import { defineConfig } from 'vite';
import { copyFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const watchPublicData = () => ({
  name: 'watch-public-data',
  buildStart() { readdirSync('public/data').forEach(f => this.addWatchFile(resolve('public/data', f))); },
  writeBundle() { readdirSync('public/data').forEach(f => copyFileSync(`public/data/${f}`, `../../Documents/docker-container/src/gratulationsdienst/data/${f}`)); },
});

export default defineConfig({
  base: '/gratulationsdienst/',
  build: {
    outDir: '../../Documents/docker-container/src/gratulationsdienst',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/php-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
