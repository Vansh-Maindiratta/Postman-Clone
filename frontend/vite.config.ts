import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyPort = Number(process.env.PORT) || 3001;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy': `http://localhost:${proxyPort}`,
    },
  },
});
