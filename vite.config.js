import { defineConfig } from 'vite';
import { copyFileSync, readdirSync, rmSync, watch } from 'node:fs';
import { execSync } from 'node:child_process';

const dataDest = 'docker/src/gratulationsdienst/data';
const copyDataFile = file => { try { copyFileSync(`public/data/${file}`, `${dataDest}/${file}`); } catch {} };
const gitShortHash = () => { try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'nogit'; } };
const buildDateStamp = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');
const appVersion = `${buildDateStamp()}-${gitShortHash()}`;

// vite build --watch beobachtet public/ nicht zuverlässig -> eigener fs.watch kopiert Datenänderungen direkt
const cleanAssets = () => ({
  name: 'clean-assets',
  buildStart() { rmSync('docker/src/gratulationsdienst/assets', { recursive: true, force: true }); }
});

const watchPublicData = () => {
  let fsWatcher;
  return {
    name: 'watch-public-data',
    // this._fsWatch würde nicht reichen: Vite erzeugt bei jedem Rebuild im Watch-Modus einen neuen Plugin-Context,
    // dadurch würde bei jeder Dateiänderung ein zusätzlicher fs.watch angehäuft, bis Handles/Watch-Mode kollabieren
    buildStart() {
      if (this.meta.watchMode && !fsWatcher) fsWatcher = watch('public/data', (_event, file) => file && copyDataFile(file));
    },
    writeBundle() { readdirSync('public/data').forEach(copyDataFile); },
  };
};

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
