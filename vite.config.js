import { defineConfig } from 'vite';
import { copyFileSync, readdirSync, rmSync, watch } from 'node:fs';
import { execSync } from 'node:child_process';

const dataDest = 'docker/src/gratulationsdienst/data';
const copyDataFile = file => { try { copyFileSync(`public/data/${file}`, `${dataDest}/${file}`); } catch {} };
const gitShortHash = () => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'nogit'; } };
const buildDateStamp = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');
const appVersion = `${buildDateStamp()}-${gitShortHash()}`;

// vite build --watch beobachtet public/ nicht zuverlässig -> eigener fs.watch kopiert Datenänderungen direkt
const cleanAssets = () => ({
  name: 'clean-assets',
  buildStart() { rmSync('docker/src/gratulationsdienst/assets', { recursive: true, force: true }); }
});

const watchPublicData = () => ({
  name: 'watch-public-data',
  buildStart() {
    if (this.meta.watchMode && !this._fsWatch) this._fsWatch = watch('public/data', (_event, file) => file && copyDataFile(file));
  },
  writeBundle() { readdirSync('public/data').forEach(copyDataFile); },
});

export default defineConfig({
  base: '/gratulationsdienst/',
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [cleanAssets(), watchPublicData()],
  build: {
    outDir: 'docker/src/gratulationsdienst',
    emptyOutDir: false,
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
