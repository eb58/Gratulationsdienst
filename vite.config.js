import { defineConfig } from 'vite';

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
