import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gratulationsdienst/',
  server: {
    proxy: {
      '/php-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
