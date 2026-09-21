import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['opentype.js', 'fflate', 'jszip', 'file-saver']
  },
  server: {
    port: 5173,
    host: true
  }
});
